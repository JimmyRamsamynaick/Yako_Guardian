const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotStatus } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'online',
    description: 'Change le statut du bot (En ligne)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('online.permission', message.guild.id), []);
        }
        await setBotStatus(client, message, 'online');
    }
};