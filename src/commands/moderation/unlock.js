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
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null // Reset to default (or true)
            });
            
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
