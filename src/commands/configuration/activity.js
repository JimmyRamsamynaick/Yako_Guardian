const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { setBotActivity, setBotStatus } = require('../../utils/presenceUtils');
const { db } = require('../../database');

module.exports = {
    name: 'activity',
    description: 'Commandes de gestion d\'activité et de statut (Multi-serveur)',
    category: 'Configuration',
    aliases: [
        'playto', 'play', 'watch', 'listen', 'stream', 'compet',
        'online', 'idle', 'dnd', 'invisible',
        'remove' // for +remove activity
    ],
    async run(client, message, args) {
        // Permission check: Administrator
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour utiliser cette commande.", []);
        }

        let commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // Handle +remove activity special case
        if (commandName === 'remove') {
            if (args[0]?.toLowerCase() === 'activity') {
                try {
                    db.prepare('UPDATE guild_settings SET bot_activity_type = NULL, bot_activity_text = NULL, bot_activity_url = NULL WHERE guild_id = ?').run(message.guild.id);
                    
                    // Force update if possible, but rotation will handle it
                    // To show immediate effect, we might want to clear presence if no other servers have custom presence
                    // But simpler is just to confirm
                    return sendV2Message(client, message.channel.id, "✅ Activité supprimée pour ce serveur.", []);
                } catch (e) {
                    return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
                }
            }
            return; // Other remove commands handled elsewhere or return help?
        }

        // --- STATUS ---
        const statuses = ['online', 'idle', 'dnd', 'invisible'];
        if (statuses.includes(commandName)) {
            return await setBotStatus(client, message, commandName);
        }

        // --- ACTIVITY ---
        let typeStr;
        if (commandName === 'playto' || commandName === 'play') typeStr = 'play';
        else if (commandName === 'watch') typeStr = 'watch';
        else if (commandName === 'listen') typeStr = 'listen';
        else if (commandName === 'compet') typeStr = 'compete';
        else if (commandName === 'stream') typeStr = 'stream';

        if (typeStr) {
            const text = args.join(' ');
            
            // Check for URL if stream
            let url = null;
            if (typeStr === 'stream') {
                const lastArg = args[args.length - 1];
                if (lastArg && lastArg.startsWith('http')) {
                    url = lastArg;
                    // Remove url from text
                    // text = args.slice(0, -1).join(' '); // Optional, but usually Twitch url is separate
                } else {
                    // Default Twitch URL if none provided (required for Streaming status to show purple)
                    url = 'https://www.twitch.tv/discord';
                }
            }

            if (!text) {
                return sendV2Message(client, message.channel.id, `❌ Précisez le message (séparez par \`,,\` pour plusieurs phrases).`, []);
            }

            return await setBotActivity(client, message, typeStr, text, url);
        }
    }
};
