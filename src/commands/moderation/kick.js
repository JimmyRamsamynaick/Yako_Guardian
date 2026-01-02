const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'kick',
    description: 'Expulse un ou plusieurs membres',
    category: 'Moderation',
    usage: 'kick <user> [raison] | kick <user1>,, <user2> [raison]',
    examples: ['kick @user Spam', 'kick @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission', await t('common.permission_missing', message.guild.id, { perm: 'KickMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading
        const loadingEmbed = createEmbed('Expulsion', `${THEME.icons.loading} Recherche des utilisateurs...`, 'loading');
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        // Processing
        await replyMsg.edit({ embeds: [createEmbed('Expulsion', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

        const summary = [];
        const successMembers = [];

        for (const targetMember of members) {
             if (targetMember.id === message.author.id) {
                summary.push(`❌ **${targetMember.user.tag}**: ${await t('moderation.self_sanction', message.guild.id)}`);
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(`❌ **${targetMember.user.tag}**: ${await t('moderation.bot_sanction', message.guild.id)}`);
                continue;
            }

            if (!targetMember.kickable) {
                summary.push(`❌ **${targetMember.user.tag}**: ${await t('moderation.hierarchy_bot', message.guild.id)}`);
                continue;
            }

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(`❌ **${targetMember.user.tag}**: ${await t('moderation.role_hierarchy', message.guild.id)}`);
                continue;
            }

            try {
                await targetMember.send(await t('moderation.kick_dm_reason', message.guild.id, { guild: message.guild.name, reason })).catch(() => {});
                await targetMember.kick(reason);

                await addSanction(message.guild.id, targetMember.id, message.author.id, 'kick', reason);
                successMembers.push(targetMember);
            } catch (err) {
                console.error(err);
                summary.push(`❌ **${targetMember.user.tag}**: ${await t('moderation.kick_fail', message.guild.id)}`);
            }
        }

        let embed;
        if (successMembers.length === 1 && summary.length === 0) {
            const member = successMembers[0];
            const description = `${THEME.separators.line}\n` +
                `👤 **Membre :** ${member.user.tag}\n` +
                `📌 **Action :** EXPULSION\n` +
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
             let description = "";
            if (successMembers.length > 0) {
                description += `✅ **Succès (${successMembers.length}):**\n${successMembers.map(m => `\`${m.user.tag}\``).join(', ')}\n\n`;
            }
            if (summary.length > 0) {
                description += `⚠️ **Erreurs:**\n${summary.join('\n')}\n\n`;
            }
            description += `**Raison:** ${reason}`;
            
            embed = createEmbed(
                'Expulsion Effectuée',
                description,
                successMembers.length > 0 ? (summary.length > 0 ? 'warning' : 'success') : 'error',
                { footer: `Modérateur: ${message.author.tag}` }
            );
        }

        await replyMsg.edit({ embeds: [embed] });
    }
};
