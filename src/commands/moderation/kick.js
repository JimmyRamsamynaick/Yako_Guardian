const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'kick',
    description: 'kick.description',
    category: 'Moderation',
    usage: 'kick.usage',
    examples: ['kick @user Spam', 'kick @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'KickMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading
        const loadingEmbed = createEmbed(await t('moderation.kick_title', message.guild.id), `${THEME.icons.loading} ${await t('common.loading_users', message.guild.id)}`, 'loading');
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        // Processing
        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.kick_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

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
                `👤 **${await t('common.member_label', message.guild.id)}** ${member.user.tag}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** ${await t('moderation.kick_title', message.guild.id).then(s => s.toUpperCase())}\n` +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${reason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
            
            embed = createEmbed(
                await t('moderation.kick_moderation_title', message.guild.id),
                description,
                'moderation',
                { footer: await t('common.moderator_footer', message.guild.id, { tag: message.author.tag }) }
            );
        } else {
             let description = "";
            if (successMembers.length > 0) {
                description += `✅ **${await t('common.success_count', message.guild.id, { count: successMembers.length })}**\n${successMembers.map(m => `\`${m.user.tag}\``).join(', ')}\n\n`;
            }
            if (summary.length > 0) {
                description += `⚠️ **${await t('common.errors_label', message.guild.id)}**\n${summary.join('\n')}\n\n`;
            }
            description += `**${await t('common.reason_label', message.guild.id)}** ${reason}`;
            
            embed = createEmbed(
                await t('moderation.kick_executed_title', message.guild.id),
                description,
                successMembers.length > 0 ? (summary.length > 0 ? 'warning' : 'success') : 'error',
                { footer: await t('common.moderator_footer', message.guild.id, { tag: message.author.tag }) }
            );
        }

        await replyMsg.edit({ embeds: [embed] });
    }
};
