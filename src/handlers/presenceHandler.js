const { ActivityType } = require('discord.js');
const { db } = require('../database');

module.exports = (client) => {
    // Rotation interval (every 15 seconds)
    // Discord rate limit is 5 updates per minute (1 update every 12s). 15s is safe.
    setInterval(() => {
        try {
            // Fetch all guilds that have custom status OR activity
            const configs = db.prepare(`
                SELECT guild_id, bot_status, bot_activity_type, bot_activity_text, bot_activity_url 
                FROM guild_settings 
                WHERE bot_status IS NOT NULL OR bot_activity_type IS NOT NULL
            `).all();

            if (configs.length === 0) return;

            // Flatten configs if they have multiple activities separated by ",,"
            // We want to create a pool of "Displayable Items"
            let pool = [];

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
                    // But we can't really set "only status" if others have activity.
                    // So we prioritize those WITH activity.
                    // If NO one has activity, we just rotate status?
                    // Changing status frequently is less noticeable. 
                    // Let's just push a placeholder if we want to support "Just Status" rotation
                    pool.push({
                        status: status,
                        type: null,
                        text: null
                    });
                }
            });

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