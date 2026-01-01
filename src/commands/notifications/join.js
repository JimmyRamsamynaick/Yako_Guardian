const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showJoinMenu } = require('../../handlers/notificationHandler');

module.exports = {
    name: 'join',
    description: 'Configure les messages de bienvenue',
    async execute(client, message, args) {
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const { sendV2Message } = require('../../utils/componentUtils');
                return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showJoinMenu(message, config);
        } else {
             // Handle other join subcommands if any, or help
             const { sendV2Message } = require('../../utils/componentUtils');
             sendV2Message(client, message.channel.id, "Utilisation: `+join settings`", []);
        }
    }
};
