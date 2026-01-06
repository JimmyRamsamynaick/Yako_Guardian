const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showTwitchMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'twitch',
    description: 'Configure les alertes Twitch',
    category: 'Notifications',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('twitch.permission', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        await showTwitchMenu(message, config);
    }
};
