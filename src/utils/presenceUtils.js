const { ActivityType } = require('discord.js');
const { db } = require('../database');
const { sendV2Message } = require('./componentUtils');
const { t } = require('./i18n');

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

        return sendV2Message(client, message.channel.id, await t('presence.status_success', message.guild.id, { status: status }), []);
    } catch (e) {
        return sendV2Message(client, message.channel.id, await t('presence.error', message.guild.id, { error: e.message }), []);
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
        let activityTypeKey = 'presence.type_play';

        if (typeStr === 'play') { typeEnum = ActivityType.Playing; activityTypeKey = 'presence.type_play'; }
        else if (typeStr === 'watch') { typeEnum = ActivityType.Watching; activityTypeKey = 'presence.type_watch'; }
        else if (typeStr === 'listen') { typeEnum = ActivityType.Listening; activityTypeKey = 'presence.type_listen'; }
        else if (typeStr === 'compete') { typeEnum = ActivityType.Competing; activityTypeKey = 'presence.type_compete'; }
        else if (typeStr === 'stream') { typeEnum = ActivityType.Streaming; activityTypeKey = 'presence.type_stream'; }

        const activityTypeDisplay = await t(activityTypeKey, message.guild.id);

        // Save to DB for rotation
        db.prepare('INSERT INTO guild_settings (guild_id, bot_activity_type, bot_activity_text, bot_activity_url) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET bot_activity_type = ?, bot_activity_text = ?, bot_activity_url = ?')
            .run(message.guild.id, typeStr, text, url, typeStr, text, url);

        // Force immediate update (show first phrase)
        const firstActivity = text.split(',,')[0].trim();
        client.user.setActivity(firstActivity, { type: typeEnum, url: url });

        return sendV2Message(client, message.channel.id, await t('presence.activity_success', message.guild.id, { type: activityTypeDisplay, text: text }), []);
    } catch (e) {
        return sendV2Message(client, message.channel.id, await t('presence.error', message.guild.id, { error: e.message }), []);
    }
}

module.exports = { setBotStatus, setBotActivity };