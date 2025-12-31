const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotActivity } = require('../../utils/presenceUtils');

module.exports = {
    name: 'stream',
    description: 'Change l\'activité du bot (Streame...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const text = args.join(' ');
        if (!text) return sendV2Message(client, message.channel.id, "**Usage:** `+stream <texte>` (séparez par `,,` pour alterner)", []);

        // Use a default URL if not extracted, or maybe args?
        // Crowbot just says +stream [message]. It likely uses a default twitch url.
        const defaultUrl = 'https://www.twitch.tv/discord';
        
        await setBotActivity(client, message, 'stream', text, defaultUrl);
    }
};