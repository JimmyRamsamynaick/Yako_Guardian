const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');
const ms = require('ms');

module.exports = {
    name: 'mute',
    description: 'mute.description',
    category: 'Moderation',
    usage: 'mute.usage',
    examples: ['mute @user Spam', 'mute 1h @user Spam', 'mute @user 10m'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        // Loading state
        const loadingEmbed = createEmbed(
            await t('moderation.mute_title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading_users', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        // 1. Check for Duration at start (mute <duration> <user>)
        let duration = null;
        let durationStr = null;

        if (args.length > 0) {
            try {
                const d = ms(args[0]);
                if (d && d >= 1000 && d <= 2419200000) { // Max 28 days
                    duration = d;
                    durationStr = args[0];
                    args.shift(); // Consume duration arg
                }
            } catch {}
        }

        const { members, reason: rawReason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        // 2. If no duration at start, check reason (mute <user> <duration>)
        let actualReason = rawReason;
        if (!duration && rawReason) {
            const reasonParts = rawReason.trim().split(/\s+/);
            const potentialDuration = reasonParts[0];
            try {
                const d = ms(potentialDuration);
                if (d && d >= 1000 && d <= 2419200000) {
                    duration = d;
                    durationStr = potentialDuration;
                    actualReason = reasonParts.slice(1).join(' ') || await t('moderation.reason_none', message.guild.id);
                }
            } catch {}
        }

        if (!actualReason) actualReason = await t('moderation.reason_none', message.guild.id);

        const config = await getGuildConfig(message.guild.id);
        const roleId = config.moderation?.muteRole;
        const useTimeout = config.moderation?.timeoutEnabled !== false; // Default true

        // For permanent mute (no duration), role is required.
        // For temp mute, role is required ONLY if timeout is disabled.
        if (!duration && !roleId) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.configuration_missing', message.guild.id), await t('moderation.mute_role_not_configured', message.guild.id), 'error')] });
        }
        if (duration && !useTimeout && !roleId) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.configuration_missing', message.guild.id), await t('moderation.mute_role_not_configured', message.guild.id), 'error')] });
        }

        const role = roleId ? message.guild.roles.cache.get(roleId) : null;
        if ((!duration || !useTimeout) && !role) {
             return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('common.role_not_found', message.guild.id), 'error')] });
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('moderation.mute_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

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

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.role_hierarchy', message.guild.id)}`);
                continue;
            }

            try {
                let actionText = "";
                let actionType = 'mute';
                
                if (duration) {
                    // TEMP MUTE
                    actionType = 'tempmute';
                    if (useTimeout) {
                        if (!targetMember.moderatable) {
                            summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.hierarchy_bot', message.guild.id)}`);
                            continue;
                        }
                        await targetMember.timeout(duration, actualReason);
                        actionText = await t('moderation.action_timeout', message.guild.id, { duration: durationStr });
                    } else {
                        // Role based temp mute
                        if (targetMember.roles.cache.has(roleId)) {
                            // Already muted, maybe update duration? For now just skip or continue.
                            // We proceed to ensure db entry is updated.
                        }
                        await targetMember.roles.add(role, actualReason);
                        actionText = await t('moderation.action_muterole', message.guild.id, { duration: durationStr });
                    }

                    // Log Sanction
                    await addSanction(message.guild.id, targetMember.id, message.author.id, 'tempmute', actualReason, duration);

                    // DM
                    const dmEmbed = createEmbed(
                        await t('moderation.tempmute_dm_title', message.guild.id),
                        `${THEME.separators.line}\n` +
                        `**${await t('common.server_label', message.guild.id)}** ${message.guild.name}\n` +
                        `**${await t('common.action_label', message.guild.id)}** ${await t('moderation.tempmute_title', message.guild.id)}\n` +
                        `**${await t('common.duration_label', message.guild.id)}** ${durationStr}\n` +
                        `**${await t('common.reason_label', message.guild.id)}** ${actualReason}\n` +
                        `${THEME.separators.line}`,
                        'moderation'
                    );
                    targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                } else {
                    // PERMANENT MUTE
                    if (targetMember.roles.cache.has(roleId)) {
                        summary.push(`${THEME.icons.wait} **${targetMember.user.tag}**: ${await t('moderation.mute_already_muted', message.guild.id)}`);
                        continue;
                    }

                    await targetMember.roles.add(role, actualReason);
                    
                    // Log Sanction
                    await addSanction(message.guild.id, targetMember.id, message.author.id, 'mute', actualReason);

                    // DM
                    const dmEmbed = createEmbed(
                        await t('moderation.mute_dm_title', message.guild.id),
                        `${THEME.separators.line}\n` +
                        `**${await t('common.server_label', message.guild.id)}** ${message.guild.name}\n` +
                        `**${await t('common.action_label', message.guild.id)}** ${await t('moderation.mute_title', message.guild.id)}\n` +
                        `**${await t('common.reason_label', message.guild.id)}** ${actualReason}\n` +
                        `${THEME.separators.line}`,
                        'moderation'
                    );
                    targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

                    actionText = await t('moderation.mute_success_msg', message.guild.id);
                }

                successCount++;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${actionText}`);

            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        // Final Result Construction
        let finalDescription = '';
        let type = 'default';
        const title = duration ? await t('moderation.tempmute_title', message.guild.id) : await t('moderation.mute_title', message.guild.id);

        if (members.length === 1 && successCount === 1) {
            const target = members[0];
            type = 'success';
            finalDescription = 
                `${THEME.separators.line}\n` +
                `👤 **${await t('common.member_label', message.guild.id)}** ${target.user.tag}\n` +
                `📌 **${await t('common.action_label', message.guild.id)}** ${title}\n` +
                (duration ? `⏱️ **${await t('common.duration_label', message.guild.id)}** ${durationStr}\n` : '') +
                `✏️ **${await t('common.reason_label', message.guild.id)}** ${actualReason}\n\n` +
                `${THEME.icons.success} **${await t('common.success_action', message.guild.id)}**\n` +
                `${THEME.separators.line}`;
        } else {
            type = successCount > 0 ? (successCount === members.length ? 'success' : 'warning') : 'error';
            finalDescription = summary.join('\n');
            if (finalDescription.length > 4000) {
                finalDescription = finalDescription.substring(0, 4000) + '...';
            }
        }

        const finalEmbed = createEmbed(title, finalDescription, type);
        await replyMsg.edit({ embeds: [finalEmbed] });
    }
};
