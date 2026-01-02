const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../mongoUtils');
const UserStrike = require('../../database/models/UserStrike');
const ms = require('ms');

const { createEmbed } = require('../design');
const { t } = require('../i18n');

async function applyPunishment(client, message, userId, guildConfig) {
    if (!guildConfig.moderation || !guildConfig.moderation.strikes) return;

    // 1. Get User Strike Count
    const strikeData = await UserStrike.findOne({ guildId: message.guild.id, userId: userId });
    const strikeCount = strikeData ? strikeData.strikes.length : 0;

    // 2. Find matching punishment
    const punishments = guildConfig.moderation.strikes.punishments || [];
    const rule = punishments.find(p => p.count === strikeCount);

    if (!rule) return; // No rule for this specific strike count

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    // 3. Execute Action
    try {
        let actionTaken = "";
        const reasonText = await t('automod.reason_strikes', message.guild.id, { count: strikeCount });
        
        switch (rule.action) {
            case 'kick':
                if (member.kickable) {
                    await member.kick(reasonText);
                    actionTaken = await t('automod.action_kicked', message.guild.id);
                }
                break;
            
            case 'ban':
                if (member.bannable) {
                    await member.ban({ reason: reasonText });
                    actionTaken = await t('automod.action_banned', message.guild.id);
                }
                break;

            case 'timeout':
                if (rule.duration && member.moderatable) {
                    await member.timeout(rule.duration, reasonText);
                    actionTaken = await t('automod.action_timeout', message.guild.id, { duration: ms(rule.duration) });
                }
                break;

            case 'mute':
                const muteRoleId = guildConfig.moderation.muteRole;
                if (muteRoleId) {
                    const role = message.guild.roles.cache.get(muteRoleId);
                    if (role && member.manageable) {
                        await member.roles.add(role, reasonText);
                        actionTaken = await t('automod.action_muted', message.guild.id);
                    }
                }
                break;
            
            case 'warn':
                // Already warned by the strike system, but maybe send a special DM?
                actionTaken = await t('automod.action_warned', message.guild.id);
                break;
        }

        if (actionTaken) {
            message.channel.send({ embeds: [createEmbed(await t('automod.punishment_applied', message.guild.id, { 
                user: member.toString(), 
                count: strikeCount, 
                action: actionTaken 
            }), '', 'info')] });
        }

    } catch (err) {
        console.error("Failed to apply punishment:", err);
    }
}

module.exports = { applyPunishment };
