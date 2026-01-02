const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

module.exports = {
    name: 'tempmute',
    description: 'Mute temporairement un ou plusieurs membres',
    category: 'Moderation',
    usage: 'tempmute <user> <durée> [raison] | tempmute <user1>,, <user2> <durée> [raison]',
    examples: ['tempmute @user 1h Spam', 'tempmute @user1,, @user2 10m'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'TempMute',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason: rawReason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        // Parse duration from the beginning of rawReason
        const reasonParts = rawReason.trim().split(/\s+/);
        const durationStr = reasonParts[0];
        const actualReason = reasonParts.slice(1).join(' ') || await t('moderation.reason_none', message.guild.id);

        let duration = null;
        try {
            if (durationStr) duration = ms(durationStr);
        } catch {
            // pass
        }

        if (!duration || duration < 1000 || duration > 2419200000) { // Max 28 days for timeout
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.duration_invalid_long', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const useTimeout = config.moderation?.timeoutEnabled !== false; // Default true
        
        await replyMsg.edit({ embeds: [createEmbed('TempMute', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

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
                let actionText = "";
                
                if (useTimeout) {
                    // Use Discord Timeout
                    if (!targetMember.moderatable) {
                        summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.hierarchy_bot', message.guild.id)}`);
                        continue;
                    }
                    await targetMember.timeout(duration, actualReason);
                    actionText = await t('moderation.action_timeout', message.guild.id, { duration: durationStr });
                } else {
                    // Use Mute Role
                    const roleId = config.moderation?.muteRole;
                    if (!roleId) {
                         summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.role_not_found', message.guild.id)}`);
                         continue;
                    }
                    
                    const role = message.guild.roles.cache.get(roleId);
                    if (!role) {
                        summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.role_not_found', message.guild.id)}`);
                        continue;
                    }

                    await targetMember.roles.add(role, actualReason);
                    
                    // Schedule unmute (Basic setTimeout - in production this should be in DB)
                    // For now we assume the DB handles expiring sanctions via an interval check
                    // But here we just set the role.
                    
                    actionText = await t('moderation.action_muterole', message.guild.id, { duration: durationStr });
                }

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'tempmute', actualReason, duration);

                // Send DM
                const dmEmbed = createEmbed(
                    'Sanction Temporaire',
                    `${THEME.separators.line}\n` +
                    `**Serveur :** ${message.guild.name}\n` +
                    `**Action :** Mute Temporaire\n` +
                    `**Durée :** ${durationStr}\n` +
                    `**Raison :** ${actualReason}\n` +
                    `${THEME.separators.line}`,
                    'moderation'
                );
                targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                successCount++;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${actionText}`);

            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
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
                `📌 **Action :** TEMPMUTE\n` +
                `⏱️ **Durée :** ${durationStr}\n` +
                `✏️ **Raison :** ${actualReason}\n\n` +
                `${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed('TempMute', finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
