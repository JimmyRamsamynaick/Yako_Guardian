const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotActivity } = require('../../utils/presenceUtils');

module.exports = {
    name: 'listen',
    description: 'Change l\'activité du bot (Écoute...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const text = args.join(' ');
        if (!text) return sendV2Message(client, message.channel.id, "**Usage:** `+listen <texte>` (séparez par `,,` pour alterner)", []);

        await setBotActivity(client, message, 'listen', text);
    }
};