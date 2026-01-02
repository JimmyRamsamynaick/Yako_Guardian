const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

async function resolveUser(client, text) {
    if (!text) return null;
    text = text.trim();
    // ID
    if (text.match(/^\d{17,19}$/)) {
        try {
            return await client.users.fetch(text);
        } catch { return null; }
    }
    // Mention
    const match = text.match(/^<@!?(\d+)>$/);
    if (match) {
        try {
            return await client.users.fetch(match[1]);
        } catch { return null; }
    }
    return null;
}

module.exports = {
    name: 'tempban',
    description: 'Bannit temporairement un ou plusieurs membres',
    category: 'Moderation',
    usage: 'tempban <user> <durée> [raison] | tempban <user1>,, <user2> <durée> [raison]',
    examples: ['tempban @user 1d Spam', 'tempban 123456789012345678 7d Spam', 'tempban @user1,, @user2 1d Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'TempBan',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

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
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.user_not_found', message.guild.id), 'error')] });
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
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.duration_invalid', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed('TempBan', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

        const summary = [];
        let successCount = 0;

        for (const targetUser of usersToBan) {
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

            if (member) {
                if (!member.bannable) {
                    summary.push(`${THEME.icons.error} **${targetUser.tag}**: ${await t('moderation.hierarchy_bot', message.guild.id)}`);
                    continue;
                }
                if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                    summary.push(`${THEME.icons.error} **${targetUser.tag}**: ${await t('moderation.role_hierarchy', message.guild.id)}`);
                    continue;
                }
            }

            try {
                // Send DM
                const dmEmbed = createEmbed(
                    'Sanction Temporaire',
                    `${THEME.separators.line}\n` +
                    `**Serveur :** ${message.guild.name}\n` +
                    `**Action :** Bannissement Temporaire\n` +
                    `**Durée :** ${durationStr}\n` +
                    `**Raison :** ${reason}\n` +
                    `${THEME.separators.line}`,
                    'moderation'
                );
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
                
                await message.guild.members.ban(targetUser.id, { reason });

                // Log Sanction with expiration
                await addSanction(message.guild.id, targetUser.id, message.author.id, 'tempban', reason, duration);

                successCount++;
                summary.push(`${THEME.icons.success} **${targetUser.tag}**: Banni (${durationStr})`);

            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetUser.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        // Final Result Construction
        let finalDescription = '';
        let type = 'default';

        if (usersToBan.length === 1 && successCount === 1) {
            const target = usersToBan[0];
            type = 'success';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **Membre :** ${target.tag}\n` +
                `📌 **Action :** TEMPBAN\n` +
                `⏱️ **Durée :** ${durationStr}\n` +
                `✏️ **Raison :** ${reason}\n\n` +
                `${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === usersToBan.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed('TempBan', finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
