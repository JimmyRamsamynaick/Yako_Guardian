const { PermissionsBitField, Routes } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');
const { clearSanctions, clearAllSanctions } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'clear',
    description: 'Supprime des messages ou des sanctions',
    category: 'Moderation',
    usage: 'clear <nombre> [membre] | clear sanctions <membre> | clear all sanctions',
    aliases: ['purge', 'clean'],
    examples: ['clear 10', 'clear 50 @user', 'clear sanctions @user', 'clear all sanctions'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageMessages' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const sub = args[0]?.toLowerCase();

        // --- CLEAR SANCTIONS ---
        if (sub === 'sanctions' || sub === 'sanction') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
            }

            const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
            const userId = targetMember ? targetMember.id : args[1];

            if (userId) {
                // +clear sanctions <user>
                const result = await clearSanctions(message.guild.id, userId);
                return sendV2Message(client, message.channel.id, await t('moderation.clear_sanctions_success', message.guild.id, { user: userId, count: result.deletedCount }), []);
            } else {
                return sendV2Message(client, message.channel.id, await t('moderation.clear_usage_sanctions', message.guild.id), []);
            }
        }

        // --- CLEAR ALL SANCTIONS ---
        if (sub === 'all' && args[1]?.toLowerCase() === 'sanctions') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
            }
            
            const result = await clearAllSanctions(message.guild.id);
            return sendV2Message(client, message.channel.id, await t('moderation.clear_all_sanctions_success', message.guild.id, { count: result.deletedCount }), []);
        }

        // --- CLEAR MESSAGES ---
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return sendV2Message(client, message.channel.id, await t('moderation.clear_invalid_amount', message.guild.id), []);
        }

        const targetMember = message.mentions.members.first() || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

        await message.delete().catch(() => {}); // Delete command message first

        try {
            const messages = await message.channel.messages.fetch({ limit: 100 }); // Fetch max to filter
            let messagesToDelete = [];

            if (targetMember) {
                messagesToDelete = messages.filter(m => m.author.id === targetMember.id).first(amount);
            } else {
                messagesToDelete = messages.first(amount);
            }

            if (messagesToDelete.length === 0) {
                return sendV2Message(client, message.channel.id, await t('moderation.clear_no_messages', message.guild.id), []);
            }

            await message.channel.bulkDelete(messagesToDelete, true);

            const userSuffix = targetMember ? await t('moderation.clear_success_user_suffix', message.guild.id, { user: targetMember.user.tag }) : '';
            const msg = await sendV2Message(client, message.channel.id, await t('moderation.clear_success_details', message.guild.id, { count: messagesToDelete.length, user: userSuffix }), []);
            
            // Auto delete success message after 3s
            if (msg && msg.id) {
                setTimeout(async () => {
                    try {
                        await client.rest.delete(Routes.channelMessage(message.channel.id, msg.id));
                    } catch (e) {
                        // ignore
                    }
                }, 3000);
            }

        } catch (error) {
            console.error(error);
            return sendV2Message(client, message.channel.id, await t('moderation.clear_error_old', message.guild.id), []);
        }
    }
};
