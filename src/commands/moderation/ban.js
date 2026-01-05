const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const { createEmbed, THEME } = require('../../utils/design');
const { checkAutodeleteResponse } = require('../../utils/autodelete');

module.exports = {
    name: 'ban',
    description: 'ban.description',
    category: 'Moderation',
    usage: 'ban.usage',
    examples: ['ban @user Spam', 'ban 123456789012345678 Spam', 'ban @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            await t('moderation.ban_title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading_users', message.guild.id)}`,
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
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.user_not_found', message.guild.id), 'error')] });
        }

        // Update loading state
        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.ban_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

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
                `👤 **${await t('common.member_label', message.guild.id)}** ${user.tag}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** ${await t('moderation.ban_title', message.guild.id).then(s => s.toUpperCase())}\n` +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${reason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
            
            embed = createEmbed(
                await t('moderation.ban_moderation_title', message.guild.id),
                description,
                'moderation',
                { footer: await t('common.moderator_footer', message.guild.id, { tag: message.author.tag }) }
            );
        } else {
            // Bulk or Partial
            let description = "";
            if (successUsers.length > 0) {
                description += `✅ **${await t('common.success_count', message.guild.id, { count: successUsers.length })}**\n${successUsers.map(u => `\`${u.tag}\``).join(', ')}\n\n`;
            }
            if (summary.length > 0) {
                description += `⚠️ **${await t('common.errors_label', message.guild.id)}**\n${summary.join('\n')}\n\n`;
            }
            description += `**${await t('common.reason_label', message.guild.id)}** ${reason}`;
            
            embed = createEmbed(
                await t('moderation.ban_executed_title', message.guild.id),
                description,
                successUsers.length > 0 ? (summary.length > 0 ? 'warning' : 'success') : 'error',
                { footer: await t('common.moderator_footer', message.guild.id, { tag: message.author.tag }) }
            );
        }

        await replyMsg.edit({ embeds: [embed] });

        await checkAutodeleteResponse(message, replyMsg, 'moderation');
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
