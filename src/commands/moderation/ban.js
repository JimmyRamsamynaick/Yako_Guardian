const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'ban',
    description: 'Bannit un ou plusieurs membres (ou ID)',
    category: 'Moderation',
    usage: 'ban <user> [raison] | ban <user1>,, <user2> [raison]',
    examples: ['ban @user Spam', 'ban 123456789012345678 Spam', 'ban @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission', await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            'Bannissement',
            `${THEME.icons.loading} Recherche des utilisateurs...`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const fullContent = args.join(' ');
        let usersToBan = [];
        let reason = await t('moderation.reason_none', message.guild.id);

        if (fullContent.includes(',,')) {
            // Multi-ban
            const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
            
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                let partReason = "";
                let user = await resolveUser(client, part);

                if (!user && i === parts.length - 1) {
                    const lastSpaceIndex = part.indexOf(' ');
                    if (lastSpaceIndex !== -1) {
                        const potentialId = part.substring(0, lastSpaceIndex);
                        user = await resolveUser(client, potentialId);
                        if (user) {
                            partReason = part.substring(lastSpaceIndex + 1);
                            if (reason === await t('moderation.reason_none', message.guild.id)) reason = partReason; 
                        }
                    }
                }

                if (user) {
                    usersToBan.push(user);
                } else if (i === parts.length - 1 && usersToBan.length > 0) {
                     reason = part;
                }
            }
        } else {
            // Single ban
            const targetUser = await resolveUser(client, args[0]);
            if (targetUser) {
                usersToBan.push(targetUser);
                if (args.length > 1) reason = args.slice(1).join(' ');
            }
        }

        if (usersToBan.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.user_not_found', message.guild.id), 'error')] });
        }

        // Update loading state
        await replyMsg.edit({ embeds: [createEmbed('Bannissement', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

        const summary = [];
        const successUsers = [];

        for (const targetUser of usersToBan) {
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

            if (member) {
                if (!member.bannable) {
                    summary.push(`❌ **${targetUser.tag}**: ${await t('moderation.hierarchy_bot', message.guild.id)}`);
                    continue;
                }
                if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                    summary.push(`❌ **${targetUser.tag}**: ${await t('moderation.role_hierarchy', message.guild.id)}`);
                    continue;
                }
            }

            try {
                await targetUser.send(await t('moderation.ban_dm_reason', message.guild.id, { guild: message.guild.name, reason })).catch(() => {});
                await message.guild.members.ban(targetUser.id, { reason });

                await addSanction(message.guild.id, targetUser.id, message.author.id, 'ban', reason);
                successUsers.push(targetUser);
            } catch (err) {
                console.error(err);
                summary.push(`❌ **${targetUser.tag}**: ${await t('moderation.ban_fail', message.guild.id)}`);
            }
        }

        let embed;
        if (successUsers.length === 1 && summary.length === 0) {
            // Single Success - Premium Style
            const user = successUsers[0];
            const description = `${THEME.separators.line}\n` +
                `👤 **Membre :** ${user.tag}\n` +
                `📌 **Action :** BANNISSEMENT\n` +
                `✏️ **Raison :** ${reason}\n\n` +
                `${THEME.icons.success} **Action effectuée avec succès**\n` +
                `${THEME.separators.line}`;
            
            embed = createEmbed(
                'MODÉRATION',
                description,
                'moderation',
                { footer: `Modérateur: ${message.author.tag}` }
            );
        } else {
            // Bulk or Partial
            let description = "";
            if (successUsers.length > 0) {
                description += `✅ **Succès (${successUsers.length}):**\n${successUsers.map(u => `\`${u.tag}\``).join(', ')}\n\n`;
            }
            if (summary.length > 0) {
                description += `⚠️ **Erreurs:**\n${summary.join('\n')}\n\n`;
            }
            description += `**Raison:** ${reason}`;
            
            embed = createEmbed(
                'Bannissement Effectué',
                description,
                successUsers.length > 0 ? (summary.length > 0 ? 'warning' : 'success') : 'error',
                { footer: `Modérateur: ${message.author.tag}` }
            );
        }

        await replyMsg.edit({ embeds: [embed] });
    }
};

async function resolveUser(client, text) {
    if (!text) return null;
    text = text.trim();
    const mentionMatch = text.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return await client.users.fetch(mentionMatch[1]).catch(() => null);
    if (text.match(/^\d{17,19}$/)) return await client.users.fetch(text).catch(() => null);
    return null;
}
