const { PermissionsBitField, Routes } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const { clearSanctions, clearAllSanctions } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'clear',
    description: 'clear.description',
    category: 'Moderation',
    usage: 'clear.usage',
    aliases: ['purge', 'clean'],
    examples: ['clear 10', 'clear 50 @user', 'clear sanctions @user', 'clear all sanctions'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageMessages' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const sub = args[0]?.toLowerCase();

        // --- CLEAR SANCTIONS ---
        if (sub === 'sanctions' || sub === 'sanction') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
            }

            const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
            const userId = targetMember ? targetMember.id : args[1];

            if (userId) {
                // +clear sanctions <user>
                const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.clear_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.clear_process_sanctions', message.guild.id)}`, 'loading')] });
                const result = await clearSanctions(message.guild.id, userId);
                
                await replyMsg.edit({ embeds: [createEmbed(
                    await t('moderation.clear_success_sanctions_title', message.guild.id), 
                    `${THEME.icons.success} ${await t('moderation.clear_sanctions_success', message.guild.id, { user: userId, count: result.deletedCount })}`, 
                    'success'
                )] });
                return;
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.clear_usage_sanctions', message.guild.id), 'error')] });
            }
        }

        // --- CLEAR ALL SANCTIONS ---
        if (sub === 'all' && args[1]?.toLowerCase() === 'sanctions') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
            }
            
            const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.clear_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.clear_process_all_sanctions', message.guild.id)}`, 'loading')] });
            const result = await clearAllSanctions(message.guild.id);
            
            await replyMsg.edit({ embeds: [createEmbed(
                await t('moderation.clear_success_sanctions_title', message.guild.id), 
                `${THEME.icons.success} ${await t('moderation.clear_all_sanctions_success', message.guild.id, { count: result.deletedCount })}`, 
                'success'
            )] });
            return;
        }

        // --- CLEAR MESSAGES ---
        const limit = 100;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > limit) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.clear_invalid_amount', message.guild.id) + ` (Max: ${limit})`, 'error')] });
        }

        const targetMember = message.mentions.members.first() || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

        await message.delete().catch(() => {}); // Delete command message first

        const loadingEmbed = createEmbed(
            await t('moderation.clear_title', message.guild.id),
            `${THEME.icons.loading} ${await t('moderation.clear_process_messages', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        try {
            const messages = await message.channel.messages.fetch({ limit: 100 }); // Fetch max to filter
            let messagesToDelete = [];

            if (targetMember) {
                // Filter messages by user, take only 'amount'
                const userMessages = messages.filter(m => m.author.id === targetMember.id);
                // Convert Collection to Array to slice
                messagesToDelete = Array.from(userMessages.values()).slice(0, amount);
            } else {
                // Take 'amount' messages (excluding the loading message we just sent if it was caught, but fetch happened before send? No, await send happened before fetch)
                // Actually, fetch includes the loading message we just sent?
                // Wait, we sent replyMsg.
                // If we delete replyMsg, we can't edit it later.
                // We should exclude replyMsg from deletion.
                
                // Better approach: Fetch 100, filter out replyMsg, then take amount.
                messagesToDelete = Array.from(messages.filter(m => m.id !== replyMsg.id).values()).slice(0, amount);
            }

            if (messagesToDelete.length === 0) {
                await replyMsg.edit({ embeds: [createEmbed(await t('common.info_title', message.guild.id), await t('moderation.clear_no_messages', message.guild.id), 'warning')] });
                setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
                return;
            }

            await message.channel.bulkDelete(messagesToDelete, true);

            const userSuffix = targetMember ? await t('moderation.clear_success_user_suffix', message.guild.id, { user: `**${targetMember.user.tag}**` }) : '';
            const successEmbed = createEmbed(
                await t('common.success_title', message.guild.id),
                await t('moderation.clear_success_details', message.guild.id, { count: messagesToDelete.length, user: userSuffix }),
                'success'
            );
            
            await replyMsg.edit({ embeds: [successEmbed] });
            
            // Auto delete success message after 3s
            setTimeout(async () => {
                try {
                    await replyMsg.delete();
                } catch (e) {
                    // ignore
                }
            }, 3000);

        } catch (error) {
            console.error(error);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.clear_error_old', message.guild.id), 'error')] });
            setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
        }
    }
};
