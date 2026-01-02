const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'mute',
    description: 'Mute un ou plusieurs membres définitivement (nécessite un rôle Mute)',
    category: 'Moderation',
    usage: 'mute <user> [raison] | mute <user1>,, <user2> [raison]',
    examples: ['mute @user Spam', 'mute @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        const roleId = config.moderation?.muteRole;

        if (!roleId) {
            return sendV2Message(client, message.channel.id, await t('moderation.mute_role_not_configured', message.guild.id), []);
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return sendV2Message(client, message.channel.id, await t('common.role_not_found', message.guild.id), []);
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

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.role_hierarchy', message.guild.id) }));
                continue;
            }

            try {
                await targetMember.roles.add(role, reason);
                
                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'mute', reason);

                targetMember.send(await t('moderation.mute_dm_reason', message.guild.id, { guild: message.guild.name, reason })).catch(() => {});
                summary.push(await t('moderation.mute_success', message.guild.id, { user: targetMember.user.tag, reason }));

            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.error_generic', message.guild.id) }));
            }
        }

        // Split summary if too long
        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('common.error_generic', message.guild.id), []);
    }
};
