const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');
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
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'Mute',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const roleId = config.moderation?.muteRole;

        if (!roleId) {
            return replyMsg.edit({ embeds: [createEmbed('Configuration Manquante', await t('moderation.mute_role_not_configured', message.guild.id), 'error')] });
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('common.role_not_found', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed('Mute', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

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
                    summary.push(`${THEME.icons.wait} **${targetMember.user.tag}**: Déjà mute`);
                    continue;
                }

                await targetMember.roles.add(role, reason);
                
                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'mute', reason);

                // Send DM
                const dmEmbed = createEmbed(
                    'Sanction',
                    `${THEME.separators.line}\n` +
                    `**Serveur :** ${message.guild.name}\n` +
                    `**Action :** Mute\n` +
                    `**Raison :** ${reason}\n` +
                    `${THEME.separators.line}`,
                    'moderation'
                );
                targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                successCount++;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: Mute effectué`);

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
                `👤 **Membre :** ${target.user.tag}\n` +
                `📌 **Action :** MUTE\n` +
                `✏️ **Raison :** ${reason}\n\n` +
                `${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
        } else {
            // Bulk or Mixed Result
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed('Mute', finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
