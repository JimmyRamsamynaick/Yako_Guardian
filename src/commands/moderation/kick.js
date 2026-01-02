const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'kick',
    description: 'Expulse un ou plusieurs membres',
    category: 'Moderation',
    usage: 'kick <user> [raison] | kick <user1>,, <user2> [raison]',
    examples: ['kick @user Spam', 'kick @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'KickMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        const summary = [];

        for (const targetMember of members) {
             if (targetMember.id === message.author.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.self_sanction', message.guild.id) }));
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.bot_sanction', message.guild.id) }));
                continue;
            }

            if (!targetMember.kickable) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.hierarchy_bot', message.guild.id) }));
                continue;
            }

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.role_hierarchy', message.guild.id) }));
                continue;
            }

            try {
                await targetMember.send(await t('moderation.kick_dm_reason', message.guild.id, { guild: message.guild.name, reason })).catch(() => {});
                await targetMember.kick(reason);

                // Log sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'kick', reason);

                summary.push(await t('moderation.kick_success', message.guild.id, { user: targetMember.user.tag, reason }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.kick_fail', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};
