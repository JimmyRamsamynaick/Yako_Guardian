const { PermissionsBitField } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { applyPunishment } = require('../../utils/moderation/punishmentSystem');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'warn',
    description: 'Avertit un ou plusieurs membres (Ajoute un strike)',
    category: 'Moderation',
    usage: 'warn <user> [raison] | warn <user1>,, <user2> [raison] | warn list [user]',
    examples: ['warn @user Spam', 'warn @user1,, @user2 Spam', 'warn list'],
    async run(client, message, args) {
        // Handle "list" subcommand
        if (args[0] && args[0].toLowerCase() === 'list') {
            // 1. If a user is specified, redirect to `strikes` (Single User View)
            if (args[1]) {
                const strikesCommand = client.commands.get('strikes');
                if (strikesCommand) {
                    return strikesCommand.run(client, message, args.slice(1));
                }
            }

            // 2. If NO user specified, show Global Warn List (All Members)
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
            }

            const allStrikes = await UserStrike.find({ guildId: message.guild.id });
            const validStrikes = allStrikes.filter(doc => doc.strikes && doc.strikes.length > 0);

            if (validStrikes.length === 0) {
                return message.channel.send({ embeds: [createEmbed('Liste des Avertissements', await t('moderation.warn_list_empty', message.guild.id), 'info')] });
            }

            // Fetch ONLY relevant members to avoid Rate Limit (Opcode 8)
            const userIds = validStrikes.map(doc => doc.userId);
            let members;
            try {
                // Fetch only users in the list
                members = await message.guild.members.fetch({ user: userIds });
            } catch (e) {
                console.error("Failed to fetch members for warn list:", e);
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('moderation.warn_list_error', message.guild.id), 'error')] });
            }
            
            const list = validStrikes
                .map(doc => {
                    const member = members.get(doc.userId);
                    return {
                        user: member ? member.user : null,
                        count: doc.strikes.length,
                        lastStrike: doc.strikes[doc.strikes.length - 1].timestamp
                    };
                })
                .filter(item => item.user !== null) // Filter out members who left
                .sort((a, b) => b.count - a.count); // Sort by count descending

            if (list.length === 0) {
                return message.channel.send({ embeds: [createEmbed('Liste des Avertissements', await t('moderation.warn_list_empty', message.guild.id), 'info')] });
            }

            // Create Standard Embed (Not V2 Component)
            const embed = createEmbed(
                `${THEME.icons.mod} ${await t('moderation.warn_list_title', message.guild.id, { guild: message.guild.name })}`,
                '',
                'warning'
            ).setThumbnail(message.guild.iconURL({ dynamic: true }));

            // Display top 20 (to avoid message limit)
            const topList = list.slice(0, 20);
            const descriptionPromises = topList.map(async (item, index) => {
                return await t('moderation.warn_list_item', message.guild.id, {
                    index: index + 1,
                    user: item.user.tag,
                    count: item.count,
                    date: new Date(item.lastStrike).toLocaleDateString()
                });
            });
            const description = (await Promise.all(descriptionPromises)).join('\n\n');

            embed.setDescription(description);

            let footerText = await t('moderation.warn_list_footer', message.guild.id, { count: list.length });
            if (list.length > 20) {
                footerText += await t('moderation.warn_list_footer_limit', message.guild.id);
            }
            embed.setFooter({ text: footerText });

            return message.channel.send({ embeds: [embed] });
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'Warn',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed('Warn', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

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
                // Add Strike
                let userStrike = await UserStrike.findOne({ guildId: message.guild.id, userId: targetMember.id });
                if (!userStrike) {
                    userStrike = new UserStrike({ guildId: message.guild.id, userId: targetMember.id, strikes: [] });
                }

                userStrike.strikes.push({
                    reason: reason,
                    moderatorId: message.author.id,
                    timestamp: new Date()
                });

                await userStrike.save();

                // Apply Auto-Punishment
                const punishment = await applyPunishment(client, message.guild, targetMember, userStrike.strikes.length);
                let punishmentText = "";
                if (punishment) {
                    punishmentText = `\n**Sanction Automatique :** ${punishment}`;
                }

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'warn', reason);

                // Send DM
                const dmEmbed = createEmbed(
                    'Avertissement',
                    `${THEME.separators.line}\n` +
                    `**Serveur :** ${message.guild.name}\n` +
                    `**Action :** Warn\n` +
                    `**Raison :** ${reason}\n` +
                    (punishmentText ? punishmentText + '\n' : '') +
                    `${THEME.separators.line}`,
                    'warning'
                );
                targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                successCount++;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: Averti (Total: ${userStrike.strikes.length})${punishmentText}`);

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
            type = 'warning';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **Membre :** ${target.user.tag}\n` +
                `📌 **Action :** WARN\n` +
                `✏️ **Raison :** ${reason}\n` +
                (summary[0].includes('Sanction Automatique') ? `\n⚠️ **Sanction Auto :** ${summary[0].split('Sanction Automatique :')[1].trim()}\n` : '') +
                `\n${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed('Warn', finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
