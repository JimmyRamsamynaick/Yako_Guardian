const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../mongoUtils');
const UserStrike = require('../../database/models/UserStrike');
const ms = require('ms');

const { createEmbed } = require('../design');
const { t } = require('../i18n');

const punishmentCooldowns = new Map(); // guildId_userId -> timestamp

async function applyPunishment(client, guild, member, strikeCount, oldStrikeCount = null) {
    const config = await getGuildConfig(guild.id);
    
    if (!config.moderation || !config.moderation.strikes) return null;

    // --- COOLDOWN SYSTEM (Avoid double punishments in bursts) ---
    const cooldownKey = `${guild.id}_${member.id}`;
    const lastPunish = punishmentCooldowns.get(cooldownKey);
    if (lastPunish && (Date.now() - lastPunish) < 5000) {
        return null; // Already punished in the last 5 seconds
    }

    // Find matching punishment
    const punishments = config.moderation.strikes.punishments || [];
    
    // Sort punishments by count descending to find the highest applicable threshold
    const sortedPunishments = [...punishments].sort((a, b) => b.count - a.count);
    
    // Find the highest punishment where the threshold is reached or exceeded
    const rule = sortedPunishments.find(p => strikeCount >= p.count);

    if (!rule) {
        console.log(`[Punish] No rule reached yet for strike count ${strikeCount}`);
        return null; 
    }

    // Optimization: If it's a timeout/mute and the user is ALREADY timed out/muted, 
    // we don't need to re-apply unless we want to extend (but let's avoid spamming API)
    if (rule.action === 'timeout' && member.communicationDisabledUntilTimestamp > Date.now()) {
        return null;
    }

    if (rule.action === 'mute') {
        const muteRoleId = config.moderation.muteRole;
        if (muteRoleId && member.roles.cache.has(muteRoleId)) {
            return null; // Already has mute role
        }
    }

    console.log(`[Punish] Triggering rule: ${rule.count} flags -> ${rule.action} (${rule.duration ? ms(rule.duration) : 'no duration'})`);

    // Mark as punished to prevent double triggers during async operations
    punishmentCooldowns.set(cooldownKey, Date.now());
    // Cleanup cooldown map after 10 seconds
    setTimeout(() => punishmentCooldowns.delete(cooldownKey), 10000);

    // Execute Action
    try {
        let actionTaken = "";
        const reasonText = await t('moderation.reason_strikes', guild.id, { count: strikeCount });
        
        switch (rule.action) {
            case 'kick':
                if (member.kickable) {
                    await member.kick(reasonText);
                    actionTaken = await t('moderation.action_kicked', guild.id);
                }
                break;
            
            case 'ban':
                if (member.bannable) {
                    await member.ban({ reason: reasonText });
                    actionTaken = await t('moderation.action_banned', guild.id);
                }
                break;

            case 'timeout':
                if (rule.duration && member.moderatable) {
                    await member.timeout(rule.duration, reasonText);
                    actionTaken = await t('moderation.action_timeout', guild.id, { duration: ms(rule.duration) });
                }
                break;

            case 'mute':
                const muteRoleId = config.moderation.muteRole;
                let mutedWithRole = false;
                if (muteRoleId) {
                    const role = guild.roles.cache.get(muteRoleId);
                    if (role && member.manageable) {
                        await member.roles.add(role, reasonText);
                        actionTaken = await t('moderation.action_muted', guild.id);
                        mutedWithRole = true;
                    }
                }
                
                // Fallback to timeout if no role or failed to add role, and duration is present
                if (!mutedWithRole && rule.duration && member.moderatable) {
                    await member.timeout(rule.duration, reasonText);
                    actionTaken = await t('moderation.action_timeout', guild.id, { duration: ms(rule.duration) });
                }
                break;
            
            case 'warn':
                // Just a notification
                actionTaken = await t('moderation.action_warned', guild.id);
                break;
        }

        if (actionTaken) {
            console.log(`[Punish] Action successfully taken: ${actionTaken} for ${member.user.tag}`);
        } else {
            console.log(`[Punish] Failed to take action (insufficient permissions?)`);
        }

        return actionTaken;

    } catch (err) {
        console.error("Failed to apply punishment:", err);
        return null;
    }
}

module.exports = { applyPunishment };
