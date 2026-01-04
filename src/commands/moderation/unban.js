const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'unban',
    description: 'unban.description',
    category: 'Moderation',
    usage: 'unban.usage',
    examples: ['unban 123456789012345678', 'unban 123456789,, 987654321 Mistake'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            await t('moderation.unban_title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading_bans', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const fullContent = args.join(' ');
        let idsToUnban = [];
        let reason = await t('moderation.reason_none', message.guild.id);

        if (fullContent.includes(',,')) {
            const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
            
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                // Try to extract ID from part
                let idMatch = part.match(/^(\d{17,19})/);
                
                if (idMatch) {
                    idsToUnban.push(idMatch[1]);
                    // Check for reason in the last part if it has extra text
                    if (i === parts.length - 1 && part.length > idMatch[1].length) {
                        const remainder = part.substring(idMatch[1].length).trim();
                        if (remainder) reason = remainder;
                    }
                } else if (i === parts.length - 1 && idsToUnban.length > 0) {
                     reason = part;
                }
            }
        } else {
            if (args[0].match(/^\d{17,19}$/)) {
                idsToUnban.push(args[0]);
                if (args.length > 1) reason = args.slice(1).join(' ');
            }
        }

        if (idsToUnban.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.id_invalid', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.unban_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.unban_processing', message.guild.id)}`, 'loading')] });

        const summary = [];
        let successCount = 0;

        for (const userId of idsToUnban) {
            try {
                // Check if ban exists
                const ban = await message.guild.bans.fetch(userId).catch(() => null);
                if (!ban) {
                    summary.push(`${THEME.icons.error} **${userId}**: ${await t('moderation.not_banned', message.guild.id)}`);
                    continue;
                }

                await message.guild.members.unban(userId, reason);
                await addSanction(message.guild.id, userId, message.author.id, 'unban', reason);
                
                const userTag = ban.user ? ban.user.tag : userId;
                summary.push(`${THEME.icons.success} **${userTag}**: ${await t('moderation.unban_success_short', message.guild.id)}`);
                successCount++;
            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${userId}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        // Final Result Construction
        let finalDescription = '';
        let type = 'default';

        if (idsToUnban.length === 1 && successCount === 1) {
            const targetId = idsToUnban[0];
            type = 'success';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **${await t('common.id_label', message.guild.id)}** ${targetId}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** ${await t('moderation.unban_title', message.guild.id).then(s => s.toUpperCase())}\n` +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${reason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === idsToUnban.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed(await t('moderation.unban_title', message.guild.id), finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
