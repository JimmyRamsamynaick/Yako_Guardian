const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

module.exports = {
    name: 'tempcmute',
    description: 'Mute temporairement un ou plusieurs membres dans le salon actuel',
    usage: 'tempcmute <user> <durée> [raison] | tempcmute <user1>,, <user2> <durée> [raison]',
    category: 'Moderation',
    examples: ['tempcmute @user 1h Spam', 'tempcmute @user1,, @user2 10m'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        const { members, reason: rawReason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        // Parse duration
        const reasonParts = rawReason.trim().split(/\s+/);
        const durationStr = reasonParts[0];
        const actualReason = reasonParts.slice(1).join(' ') || await t('moderation.reason_none', message.guild.id);

        let duration = null;
        try {
            if (durationStr) duration = ms(durationStr);
        } catch {
            // pass
        }

        if (!duration || duration < 1000) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.duration_invalid', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.tempcmute_title', message.guild.id), `${THEME.icons.loading} ${await t('common.sanction_processing', message.guild.id)}`, 'loading')] });

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

            // Check if user has Admin permissions in this channel
            const perms = message.channel.permissionsFor(targetMember);
            if (perms && perms.has(PermissionsBitField.Flags.Administrator)) {
                 summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.admin_sanction', message.guild.id)}`);
                 continue;
            }

            try {
                await message.channel.permissionOverwrites.create(targetMember, {
                    SendMessages: false,
                    AddReactions: false
                }, { reason: actualReason });

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'tempcmute', actualReason, duration, message.channel.id);

                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.tempcmute_success', message.guild.id, { user: '', duration: durationStr, reason: actualReason })}`);
                successCount++;
            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        const summaryText = summary.join('\n');
        
        await replyMsg.edit({ embeds: [createEmbed(
            await t('moderation.tempcmute_title', message.guild.id),
            summaryText || await t('common.error_generic', message.guild.id),
            successCount > 0 ? 'success' : 'error'
        )] });
    }
};
