const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'hide',
    description: 'Masque un salon (empêche @everyone de voir)',
    category: 'Moderation',
    usage: 'hide [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: false
            });
            return sendV2Message(client, message.channel.id, await t('moderation.hide_success', message.guild.id, { channelId: channel.id }), []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, await t('moderation.hide_error', message.guild.id), []);
        }
    }
};
