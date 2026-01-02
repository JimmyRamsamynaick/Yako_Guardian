const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');
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
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'Unmute',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        
        await replyMsg.edit({ embeds: [createEmbed('Unmute', `${THEME.icons.loading} Levée des sanctions...`, 'loading')] });

        const summary = [];
        let successCount = 0;

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
                    summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.not_muted', message.guild.id)}`);
                } else {
                    // Log Sanction
                    await addSanction(message.guild.id, targetMember.id, message.author.id, 'unmute', reason);
                    successCount++;
                    summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${actionText}`);
                }

            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.error_internal', message.guild.id)}`);
            }
        }

        // Final Result Construction
        let finalDescription = '';
        let type = 'default';

        if (members.length === 1 && successCount === 1) {
            const target = members[0];
            type = 'success';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **Membre :** ${target.user.tag}\n` +
                `📌 **Action :** UNMUTE\n` +
                `✏️ **Détails :** ${summary[0].replace(/.*: /, '')}\n\n` +
                `${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed('Unmute', finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
