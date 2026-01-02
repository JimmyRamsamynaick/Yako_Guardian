const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'unmute',
    description: 'Unmute un ou plusieurs membres',
    category: 'Moderation',
    usage: 'unmute <user> | unmute <user1>,, <user2>',
    examples: ['unmute @user', 'unmute @user1,, @user2'],
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
        const summary = [];

        for (const targetMember of members) {
            try {
                let actionText = "";
                let performed = false;

                // 1. Try Remove Timeout
                if (targetMember.communicationDisabledUntilTimestamp > Date.now()) {
                    if (targetMember.moderatable) {
                        await targetMember.timeout(null, reason);
                        actionText += await t('moderation.timeout_removed', message.guild.id) + " ";
                        performed = true;
                    } else {
                        actionText += await t('moderation.timeout_remove_fail', message.guild.id) + " ";
                    }
                }

                // 2. Try Remove Mute Role
                const roleId = config.moderation?.muteRole;
                if (roleId) {
                    const role = message.guild.roles.cache.get(roleId);
                    if (role && targetMember.roles.cache.has(roleId)) {
                        if (targetMember.manageable) {
                             await targetMember.roles.remove(role, reason);
                             actionText += await t('moderation.muterole_removed', message.guild.id);
                             performed = true;
                        } else {
                             actionText += await t('moderation.muterole_remove_fail', message.guild.id);
                        }
                    }
                }

                if (!performed && !actionText) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.not_muted', message.guild.id) }));
                } else {
                    // Log Sanction
                    await addSanction(message.guild.id, targetMember.id, message.author.id, 'unmute', reason);
                    summary.push(await t('moderation.unmute_success_details', message.guild.id, { user: targetMember.user.tag, details: actionText }));
                }

            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.error_internal', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }
        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};
