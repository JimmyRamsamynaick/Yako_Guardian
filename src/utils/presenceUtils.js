const { ActivityType } = require('discord.js');
const { db } = require('../database');
const { sendV2Message } = require('./componentUtils');

/**
 * Update the bot's status (online, idle, dnd, invisible) for a specific guild
 * @param {object} client - Discord Client
 * @param {object} message - Message object
 * @param {string} status - The status to set
 */
async function setBotStatus(client, message, status) {
    try {
        // Save to DB for rotation
        db.prepare('INSERT INTO guild_settings (guild_id, bot_status) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET bot_status = ?').run(message.guild.id, status, status);

        // Force immediate update if this is the only server or just to show responsiveness
        // Note: This changes global status immediately, which is fine as it will rotate later if needed
        client.user.setStatus(status);

        return sendV2Message(client, message.channel.id, `✅ Statut défini sur **${status}** pour ce serveur.\n(Il alternera avec les configurations des autres serveurs).`, []);
    } catch (e) {
        return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
    }
}

/**
 * Update the bot's activity (play, watch, listen, etc.) for a specific guild
 * @param {object} client - Discord Client
 * @param {object} message - Message object
 * @param {string} typeStr - Activity type string (play, watch, listen, stream, compete)
 * @param {string} text - The activity text (can contain ",," for multiple phrases)
 * @param {string} [url] - Optional URL for streaming
 */
async function setBotActivity(client, message, typeStr, text, url = null) {
    try {
        let typeEnum = ActivityType.Playing;
        let activityTypeDisplay = 'Joue à';

        if (typeStr === 'play') { typeEnum = ActivityType.Playing; activityTypeDisplay = 'Joue à'; }
        else if (typeStr === 'watch') { typeEnum = ActivityType.Watching; activityTypeDisplay = 'Regarde'; }
        else if (typeStr === 'listen') { typeEnum = ActivityType.Listening; activityTypeDisplay = 'Écoute'; }
        else if (typeStr === 'compete') { typeEnum = ActivityType.Competing; activityTypeDisplay = 'Participe à'; }
        else if (typeStr === 'stream') { typeEnum = ActivityType.Streaming; activityTypeDisplay = 'Streame'; }

        // Save to DB for rotation
        db.prepare('INSERT INTO guild_settings (guild_id, bot_activity_type, bot_activity_text, bot_activity_url) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET bot_activity_type = ?, bot_activity_text = ?, bot_activity_url = ?')
            .run(message.guild.id, typeStr, text, url, typeStr, text, url);

        // Force immediate update (show first phrase)
        const firstActivity = text.split(',,')[0].trim();
        client.user.setActivity(firstActivity, { type: typeEnum, url: url });

        return sendV2Message(client, message.channel.id, `✅ Activité définie sur **${activityTypeDisplay} ${text}** pour ce serveur.\n(Les phrases séparées par \`,,\` alterneront dans le profil).`, []);
    } catch (e) {
        return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
    }
}

module.exports = { setBotStatus, setBotActivity };