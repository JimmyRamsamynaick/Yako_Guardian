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
    description: 'tempban.description',
    category: 'Moderation',
    usage: 'tempban.usage',
    examples: ['tempban @user 1d Spam', 'tempban 123456789012345678 7d Spam', 'tempban @user1,, @user2 1d Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            await t('moderation.tempban_title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading_users', message.guild.id)}`,
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
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.user_not_found', message.guild.id), 'error')] });
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
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.duration_invalid', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.tempban_title', message.guild.id), `${THEME.icons.loading} ${await t('common.sanction_processing', message.guild.id)}`, 'loading')] });

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
                    await t('moderation.dm_sanction_temp_title', message.guild.id),
                    `${THEME.separators.line}\n` +
                    `**${await t('common.server_label', message.guild.id)}** ${message.guild.name}\n` +
                    `**${await t('common.action_label', message.guild.id)}** ${await t('moderation.dm_action_tempban', message.guild.id)}\n` +
                    `**${await t('common.duration_label', message.guild.id)}** ${durationStr}\n` +
                    `**${await t('common.reason_label', message.guild.id)}** ${reason}\n` +
                    `${THEME.separators.line}`,
                    'moderation'
                );
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
                
                await message.guild.members.ban(targetUser.id, { reason });

                // Log Sanction with expiration
                await addSanction(message.guild.id, targetUser.id, message.author.id, 'tempban', reason, duration);

                successCount++;
                summary.push(`${THEME.icons.success} **${targetUser.tag}**: ${await t('moderation.tempban_success', message.guild.id, { duration: durationStr })}`);

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
                `👤 **${await t('common.member_label', message.guild.id)}** ${target.tag}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** TEMPBAN\n` +
                `⏱️ **${await t('common.duration_label', message.guild.id)}** ${durationStr}\n` +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${reason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === usersToBan.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed(await t('moderation.tempban_title', message.guild.id), finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
