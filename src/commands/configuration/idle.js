const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotStatus } = require('../../utils/presenceUtils');

module.exports = {
    name: 'idle',
    description: 'Change le statut du bot (Inactif)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }
        await setBotStatus(client, message, 'idle');
    }
};