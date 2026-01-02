const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { applyPunishment } = require('../../utils/moderation/punishmentSystem');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'warn',
    description: 'Avertit un ou plusieurs membres (Ajoute un strike)',
    category: 'Moderation',
    usage: 'warn <user> [raison] | warn <user1>,, <user2> [raison] | warn list [user]',
    examples: ['warn @user Spam', 'warn @user1,, @user2 Spam', 'warn list'],
    async run(client, message, args) {
        // Handle "list" subcommand
        if (args[0] && args[0].toLowerCase() === 'list') {
            // ... list logic (unchanged)
            // 1. If a user is specified, redirect to `strikes` (Single User View)
            if (args[1]) {
                const strikesCommand = client.commands.get('strikes');
                if (strikesCommand) {
                    return strikesCommand.run(client, message, args.slice(1));
                }
            }

            // 2. If NO user specified, show Global Warn List (All Members)
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
            }

            const allStrikes = await UserStrike.find({ guildId: message.guild.id });
            const validStrikes = allStrikes.filter(doc => doc.strikes && doc.strikes.length > 0);

            if (validStrikes.length === 0) {
                return sendV2Message(client, message.channel.id, await t('moderation.warn_list_empty', message.guild.id), []);
            }

            // Fetch ONLY relevant members to avoid Rate Limit (Opcode 8)
            const userIds = validStrikes.map(doc => doc.userId);
            let members;
            try {
                // Fetch only users in the list
                members = await message.guild.members.fetch({ user: userIds });
            } catch (e) {
                console.error("Failed to fetch members for warn list:", e);
                return sendV2Message(client, message.channel.id, await t('moderation.warn_list_error', message.guild.id), []);
            }
            
            const list = validStrikes
                .map(doc => {
                    const member = members.get(doc.userId);
                    return {
                        user: member ? member.user : null,
                        count: doc.strikes.length,
                        lastStrike: doc.strikes[doc.strikes.length - 1].timestamp
                    };
                })
                .filter(item => item.user !== null) // Filter out members who left
                .sort((a, b) => b.count - a.count); // Sort by count descending

            if (list.length === 0) {
                return sendV2Message(client, message.channel.id, await t('moderation.warn_list_empty', message.guild.id), []);
            }

            // Create Standard Embed (Not V2 Component)
            const embed = new EmbedBuilder()
                .setTitle(await t('moderation.warn_list_title', message.guild.id, { guild: message.guild.name }))
                .setColor('#ff9900')
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            // Display top 20 (to avoid message limit)
            const topList = list.slice(0, 20);
            const descriptionPromises = topList.map(async (item, index) => {
                return await t('moderation.warn_list_item', message.guild.id, {
                    index: index + 1,
                    user: item.user.tag,
                    count: item.count,
                    date: new Date(item.lastStrike).toLocaleDateString()
                });
            });
            const description = (await Promise.all(descriptionPromises)).join('\n\n');

            embed.setDescription(description);

            let footerText = await t('moderation.warn_list_footer', message.guild.id, { count: list.length });
            if (list.length > 20) {
                footerText += await t('moderation.warn_list_footer_limit', message.guild.id);
            }
            embed.setFooter({ text: footerText });

            // USE STANDARD SEND FOR EMBEDS (V2 components don't support Embeds directly in the same way)
            return message.channel.send({ embeds: [embed] });
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        const summary = [];
        const config = await getGuildConfig(message.guild.id);

        for (const targetMember of members) {
            if (targetMember.id === message.author.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.self_sanction', message.guild.id) }));
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.bot_sanction', message.guild.id) }));
                continue;
            }

            try {
                // Add Strike to DB
                let userStrike = await UserStrike.findOne({ guildId: message.guild.id, userId: targetMember.id });
                if (!userStrike) {
                    userStrike = new UserStrike({ guildId: message.guild.id, userId: targetMember.id, strikes: [] });
                }

                userStrike.strikes.push({
                    moderatorId: message.author.id,
                    reason: reason,
                    timestamp: new Date()
                });
                await userStrike.save();

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'warn', reason);

                // Check Automod/Punishments
                const strikeCount = userStrike.strikes.length;
                let punishmentMsg = '';

                if (config && config.automod) {
                    const punishment = await applyPunishment(message.guild, targetMember, strikeCount, config);
                    if (punishment) {
                        punishmentMsg = await t('moderation.automod_punishment', message.guild.id, { punishment });
                    }
                }

                summary.push(await t('moderation.warn_success_details', message.guild.id, { user: targetMember.user.tag, count: strikeCount, reason, punishment: punishmentMsg }));

                // Send DM
                try {
                    await targetMember.send(await t('moderation.warn_dm', message.guild.id, { guild: message.guild.name, reason }));
                } catch (err) {
                    // DM closed
                }

            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('moderation.error_internal', message.guild.id) }));
            }
        }

        // Split summary if too long
        const summaryText = summary.join('\n\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText, []);
    }
};
