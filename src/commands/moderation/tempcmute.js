const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
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
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        const { members, reason: rawReason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
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
            return sendV2Message(client, message.channel.id, await t('moderation.duration_invalid', message.guild.id), []);
        }

        const summary = [];

        for (const targetMember of members) {
             if (targetMember.id === message.author.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.self_sanction', message.guild.id) }));
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.bot_sanction', message.guild.id) }));
                continue;
            }

            // Check if user has Admin permissions in this channel
            const perms = message.channel.permissionsFor(targetMember);
            if (perms && perms.has(PermissionsBitField.Flags.Administrator)) {
                 summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.admin_sanction', message.guild.id) }));
                 continue;
            }

            try {
                await message.channel.permissionOverwrites.create(targetMember, {
                    SendMessages: false,
                    AddReactions: false
                }, { reason: actualReason });

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'tempcmute', actualReason, duration, message.channel.id);

                summary.push(await t('moderation.tempcmute_success', message.guild.id, { user: targetMember.user.tag, duration: durationStr, reason: actualReason }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.error_generic', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('common.error_generic', message.guild.id), []);
    }
};
