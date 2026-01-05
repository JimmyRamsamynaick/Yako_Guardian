const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../mongoUtils');
const UserStrike = require('../../database/models/UserStrike');
const ms = require('ms');

const { createEmbed } = require('../design');
const { t } = require('../i18n');

async function applyPunishment(client, guild, member, strikeCount) {
    const config = await getGuildConfig(guild.id);
    
    if (!config.moderation || !config.moderation.strikes) return null;

    // Find matching punishment
    const punishments = config.moderation.strikes.punishments || [];
    const rule = punishments.find(p => p.count === strikeCount);

    if (!rule) return null; // No rule for this specific strike count

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
                if (muteRoleId) {
                    const role = guild.roles.cache.get(muteRoleId);
                    if (role && member.manageable) {
                        await member.roles.add(role, reasonText);
                        actionTaken = await t('moderation.action_muted', guild.id);
                    }
                }
                break;
            
            case 'warn':
                // Just a notification
                actionTaken = await t('moderation.action_warned', guild.id);
                break;
        }

        return actionTaken;

    } catch (err) {
        console.error("Failed to apply punishment:", err);
        return null;
    }
}

module.exports = { applyPunishment };
