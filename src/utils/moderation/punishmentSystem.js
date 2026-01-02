const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const UserStrike = require('../../database/models/UserStrike');
const ms = require('ms');

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
        
        switch (rule.action) {
            case 'kick':
                if (member.kickable) {
                    await member.kick(`Automod: ${strikeCount} strikes reached.`);
                    actionTaken = "Kicked";
                }
                break;
            
            case 'ban':
                if (member.bannable) {
                    await member.ban({ reason: `Automod: ${strikeCount} strikes reached.` });
                    actionTaken = "Banned";
                }
                break;

            case 'timeout':
                if (rule.duration && member.moderatable) {
                    await member.timeout(rule.duration, `Automod: ${strikeCount} strikes reached.`);
                    actionTaken = `Timed out (${ms(rule.duration)})`;
                }
                break;

            case 'mute':
                const muteRoleId = guildConfig.moderation.muteRole;
                if (muteRoleId) {
                    const role = message.guild.roles.cache.get(muteRoleId);
                    if (role && member.manageable) {
                        await member.roles.add(role, `Automod: ${strikeCount} strikes reached.`);
                        actionTaken = "Muted (Role)";
                    }
                }
                break;
            
            case 'warn':
                // Already warned by the strike system, but maybe send a special DM?
                actionTaken = "Warned";
                break;
        }

        if (actionTaken) {
            message.channel.send(`🚨 **Punition Automatique:** ${member} a atteint **${strikeCount}** avertissements -> **${actionTaken}**.`);
        }

    } catch (err) {
        console.error("Failed to apply punishment:", err);
    }
}

module.exports = { applyPunishment };
