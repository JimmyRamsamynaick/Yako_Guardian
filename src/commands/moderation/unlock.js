const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unlock',
    description: 'unlock.description',
    category: 'Moderation',
    usage: 'unlock.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.unlock_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.unlock_process', message.guild.id)}`, 'loading')] });

        try {
            // 1. Unlock @everyone
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null // Reset to default (or true)
            });
            
            // 2. Delete ALL temporary permission overrides that were nulled during lock
            // (We don't restore specific overrides to avoid accidental security issues; owner can re-add if needed)
            const overwrites = channel.permissionOverwrites.cache;
            const promises = [];
            
            for (const [id, overwrite] of overwrites) {
                // Skip @everyone and the server owner/role for security
                if (id === message.guild.roles.everyone.id) continue;
            }
            
            await Promise.all(promises);
            
            await replyMsg.edit({ embeds: [createEmbed(
                await t('moderation.unlock_success_title', message.guild.id),
                `${THEME.icons.success} ${await t('moderation.unlock_success', message.guild.id, { channelId: channel.id })}`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.unlock_error', message.guild.id), 'error')] });
        }
    }
};
