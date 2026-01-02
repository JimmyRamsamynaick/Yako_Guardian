const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'cmute',
    description: 'Mute un ou plusieurs membres dans le salon actuel',
    category: 'Moderation',
    usage: 'cmute <user> [raison] | cmute <user1>,, <user2> [raison]',
    examples: ['cmute @user Spam', 'cmute @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), []);
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

            // Check if user has Admin permissions in this channel
            const perms = message.channel.permissionsFor(targetMember);
            if (perms && perms.has(PermissionsBitField.Flags.Administrator)) {
                 summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.admin_sanction', message.guild.id) }));
                 continue;
            }

            try {
                await message.channel.permissionOverwrites.create(targetMember, {
                    SendMessages: false,
                    AddReactions: false
                }, { reason });

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'cmute', reason, null, message.channel.id);

                summary.push(await t('moderation.cmute_success', message.guild.id, { user: targetMember.user.tag, reason }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.error_generic', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('common.error_generic', message.guild.id), []);
    }
};
