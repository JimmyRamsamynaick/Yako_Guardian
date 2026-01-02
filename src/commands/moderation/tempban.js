const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

module.exports = {
    name: 'tempban',
    description: 'Bannit temporairement un ou plusieurs membres',
    category: 'Moderation',
    usage: 'tempban <user> <durée> [raison] | tempban <user1>,, <user2> <durée> [raison]',
    examples: ['tempban @user 1d Spam', 'tempban 123456789012345678 7d Spam', 'tempban @user1,, @user2 1d Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        const fullContent = args.join(' ');
        let usersToBan = [];
        let remainder = "";

        if (fullContent.includes(',,')) {
            const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
            
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                let user = await resolveUser(client, part);

                if (!user && i === parts.length - 1) {
                    const lastSpaceIndex = part.indexOf(' ');
                    if (lastSpaceIndex !== -1) {
                        const potentialId = part.substring(0, lastSpaceIndex);
                        user = await resolveUser(client, potentialId);
                        if (user) {
                            remainder = part.substring(lastSpaceIndex + 1);
                        }
                    }
                }

                if (user) {
                    usersToBan.push(user);
                } else if (i === parts.length - 1 && usersToBan.length > 0) {
                     remainder = part;
                }
            }
        } else {
            const targetUser = await resolveUser(client, args[0]);
            if (targetUser) {
                usersToBan.push(targetUser);
                if (args.length > 1) remainder = args.slice(1).join(' ');
            }
        }

        if (usersToBan.length === 0) {
             return sendV2Message(client, message.channel.id, await t('moderation.user_not_found', message.guild.id), []);
        }

        // Parse duration
        const remainderParts = remainder.trim().split(/\s+/);
        const durationStr = remainderParts[0];
        const reason = remainderParts.slice(1).join(' ') || await t('moderation.reason_none', message.guild.id);

        let duration = null;
        try {
            if (durationStr) duration = ms(durationStr);
        } catch { }

        if (!duration || duration < 1000) {
            return sendV2Message(client, message.channel.id, await t('moderation.duration_invalid', message.guild.id), []);
        }

        const summary = [];

        for (const targetUser of usersToBan) {
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

            if (member) {
                if (!member.bannable) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.hierarchy_bot', message.guild.id) }));
                    continue;
                }
                if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.role_hierarchy', message.guild.id) }));
                    continue;
                }
            }

            try {
                await targetUser.send(await t('moderation.tempban_dm', message.guild.id, { guild: message.guild.name, duration: durationStr, reason })).catch(() => {});
                await message.guild.members.ban(targetUser.id, { reason });

                // Log Sanction with expiration
                await addSanction(message.guild.id, targetUser.id, message.author.id, 'tempban', reason, duration);

                summary.push(await t('moderation.tempban_success', message.guild.id, { user: targetUser.tag, duration: durationStr, reason }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.error_internal', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: usersToBan.length }), []);
        }
        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};

async function resolveUser(client, text) {
    if (!text) return null;
    text = text.trim();
    const mentionMatch = text.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return await client.users.fetch(mentionMatch[1]).catch(() => null);
    if (text.match(/^\d{17,19}$/)) return await client.users.fetch(text).catch(() => null);
    return null;
}
