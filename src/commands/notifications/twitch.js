const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showTwitchMenu } = require('../../handlers/notificationHandler');

module.exports = {
    name: 'twitch',
    description: 'Configure les alertes Twitch',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const { sendV2Message } = require('../../utils/componentUtils');
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const config = await getGuildConfig(message.guild.id);
        await showTwitchMenu(message, config);
    }
};
