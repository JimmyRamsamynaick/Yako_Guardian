const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

module.exports = {
    name: 'tempmute',
    description: 'Mute temporairement un ou plusieurs membres',
    category: 'Moderation',
    usage: 'tempmute <user> <durée> [raison] | tempmute <user1>,, <user2> <durée> [raison]',
    examples: ['tempmute @user 1h Spam', 'tempmute @user1,, @user2 10m'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        const { members, reason: rawReason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        // Parse duration from the beginning of rawReason
        // rawReason might be "10m Spamming" or just "10m"
        const reasonParts = rawReason.trim().split(/\s+/);
        const durationStr = reasonParts[0];
        const actualReason = reasonParts.slice(1).join(' ') || await t('moderation.reason_none', message.guild.id);

        let duration = null;
        try {
            if (durationStr) duration = ms(durationStr);
        } catch {
            // pass
        }

        if (!duration || duration < 1000 || duration > 2419200000) { // Max 28 days for timeout
            return sendV2Message(client, message.channel.id, await t('moderation.duration_invalid_long', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        const useTimeout = config.moderation?.timeoutEnabled !== false; // Default true
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

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.role_hierarchy', message.guild.id) }));
                continue;
            }

            try {
                let actionText = "";
                
                if (useTimeout) {
                    // Use Discord Timeout
                    if (!targetMember.moderatable) {
                        summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.hierarchy_bot', message.guild.id) }));
                        continue;
                    }
                    await targetMember.timeout(duration, actualReason);
                    actionText = await t('moderation.action_timeout', message.guild.id, { duration: durationStr });
                } else {
                    // Use Mute Role
                    const roleId = config.moderation?.muteRole;
                    if (!roleId) {
                         summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.role_not_found', message.guild.id) }));
                         continue;
                    }
                    
                    const role = message.guild.roles.cache.get(roleId);
                    if (!role) {
                        summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.role_not_found', message.guild.id) }));
                        continue;
                    }

                    await targetMember.roles.add(role, actualReason);
                    
                    actionText = await t('moderation.action_muterole', message.guild.id, { duration: durationStr });
                }

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'tempmute', actualReason, duration);

                targetMember.send(await t('moderation.tempmute_dm', message.guild.id, { guild: message.guild.name, duration: durationStr, reason: actualReason })).catch(() => {});
                summary.push(await t('moderation.tempmute_success', message.guild.id, { user: targetMember.user.tag, duration: durationStr, reason: actualReason }));

            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.error_internal', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};
