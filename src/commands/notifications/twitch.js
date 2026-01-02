const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showTwitchMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'twitch',
    description: 'Configure les alertes Twitch',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('twitch.permission', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        await showTwitchMenu(message, config);
    }
};
