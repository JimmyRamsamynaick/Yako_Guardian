const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'mute',
    description: 'mute.description',
    category: 'Moderation',
    usage: 'mute.usage',
    examples: ['mute @user Spam', 'mute @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            await t('moderation.mute_title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading_users', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const roleId = config.moderation?.muteRole;

        if (!roleId) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.configuration_missing', message.guild.id), await t('moderation.mute_role_not_configured', message.guild.id), 'error')] });
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('common.role_not_found', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.mute_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        const summary = [];
        let successCount = 0;

        for (const targetMember of members) {
            if (targetMember.id === message.author.id) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.self_sanction', message.guild.id)}`);
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.bot_sanction', message.guild.id)}`);
                continue;
            }

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.role_hierarchy', message.guild.id)}`);
                continue;
            }

            try {
                // Check if already muted
                if (targetMember.roles.cache.has(roleId)) {
                    summary.push(`${THEME.icons.wait} **${targetMember.user.tag}**: ${await t('moderation.mute_already_muted', message.guild.id)}`);
                    continue;
                }

                await targetMember.roles.add(role, reason);
                
                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'mute', reason);

                // Send DM
                const dmEmbed = createEmbed(
                    await t('moderation.mute_dm_title', message.guild.id),
                    `${THEME.separators.line}\n` +
                    `**${await t('common.server_label', message.guild.id)}** ${message.guild.name}\n` +
                    `**${await t('common.action_label', message.guild.id)}** ${await t('moderation.mute_title', message.guild.id)}\n` +
                    `**${await t('common.reason_label', message.guild.id)}** ${reason}\n` +
                    `${THEME.separators.line}`,
                    'moderation'
                );
                targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                successCount++;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.mute_success_msg', message.guild.id)}`);

            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        // Final Result Construction
        let finalDescription = '';
        let type = 'default';

        if (members.length === 1 && successCount === 1) {
            // Single User Success - Premium Display
            const target = members[0];
            type = 'success';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **${await t('common.member_label', message.guild.id)}** ${target.user.tag}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** ${await t('moderation.mute_title', message.guild.id)}\n` +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${reason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
        } else {
            // Bulk or Mixed Result
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed(await t('moderation.mute_title', message.guild.id), finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
