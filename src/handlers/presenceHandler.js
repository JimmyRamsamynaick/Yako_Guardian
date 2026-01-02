const { ActivityType } = require('discord.js');
const { db } = require('../database');
const { t } = require('../utils/i18n');

module.exports = (client) => {
    // Rotation interval (every 15 seconds)
    // Discord rate limit is 5 updates per minute (1 update every 12s). 15s is safe.
    setInterval(async () => {
        try {
            // Fetch all guilds that have custom status OR activity
            const configs = db.prepare(`
                SELECT guild_id, bot_status, bot_activity_type, bot_activity_text, bot_activity_url 
                FROM guild_settings 
                WHERE bot_status IS NOT NULL OR bot_activity_type IS NOT NULL
            `).all();

            // Flatten configs if they have multiple activities separated by ",,"
            // We want to create a pool of "Displayable Items"
            let pool = [];

            if (configs.length > 0) {
                configs.forEach(config => {
                    // Handle Status (Online/Idle/etc) - This applies to the activity rotation too
                    const status = config.bot_status || 'online';

                    // Handle Activities
                    if (config.bot_activity_type && config.bot_activity_text) {
                        // Split by ",," as requested
                        const texts = config.bot_activity_text.split(',,').map(t => t.trim()).filter(t => t.length > 0);
                        
                        texts.forEach(text => {
                            pool.push({
                                status: status,
                                type: config.bot_activity_type,
                                text: text,
                                url: config.bot_activity_url
                            });
                        });
                    } else if (config.bot_status) {
                        // If only status is set but no activity, add a "blank" activity just to set status
                        pool.push({
                            status: status,
                            type: null,
                            text: null
                        });
                    }
                });
            }

            // Fallback: Default Localized Presence if pool is empty
            // This ensures the bot always has a presence even if no guild set one.
            if (pool.length === 0) {
                const serverCount = client.guilds.cache.size;
                const act1 = await t('presence.handler.default_activity_1', null);
                const act2 = await t('presence.handler.default_activity_2', null, { servers: serverCount });
                const act3 = await t('presence.handler.default_activity_3', null);

                // Add default activities to pool
                pool.push({ status: 'online', type: 'watch', text: act1 });
                pool.push({ status: 'online', type: 'play', text: act2 });
                pool.push({ status: 'online', type: 'listen', text: act3 });
            }

            if (pool.length === 0) return;

            // Pick a random item from the pool
            const item = pool[Math.floor(Math.random() * pool.length)];

            // Apply Status
            if (item.status) {
                client.user.setStatus(item.status);
            }

            // Apply Activity
            if (item.type && item.text) {
                let typeEnum = ActivityType.Playing;
                const typeStr = item.type;

                if (typeStr === 'play') typeEnum = ActivityType.Playing;
                else if (typeStr === 'watch') typeEnum = ActivityType.Watching;
                else if (typeStr === 'listen') typeEnum = ActivityType.Listening;
                else if (typeStr === 'compete') typeEnum = ActivityType.Competing;
                else if (typeStr === 'stream') typeEnum = ActivityType.Streaming;

                client.user.setActivity(item.text, { type: typeEnum, url: item.url });
            }

        } catch (error) {
            console.error('Presence Rotation Error:', error);
        }
    }, 15000); // 15 seconds
};
