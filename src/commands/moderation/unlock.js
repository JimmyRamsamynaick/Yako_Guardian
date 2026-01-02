const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unlock',
    description: 'Déverrouille un salon (autorise @everyone à parler)',
    category: 'Moderation',
    usage: 'unlock [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null // Reset to default (or true)
            });
            return sendV2Message(client, message.channel.id, await t('moderation.unlock_success', message.guild.id, { channelId: channel.id }), []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, await t('moderation.unlock_error', message.guild.id), []);
        }
    }
};
