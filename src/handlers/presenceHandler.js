const { ActivityType } = require('discord.js');
const { db } = require('../database');
const { t } = require('../utils/i18n');

module.exports = (client) => {
    // Rotation interval (every 15 seconds)
    setInterval(async () => {
        try {
            // Force the specific status requested by user
            client.user.setActivity('sur les personnes malveillantes', { 
                type: ActivityType.Streaming, 
                url: 'https://www.twitch.tv/jimmy_9708' 
            });
            
            // Optional: Ensure status is online/dnd/etc if needed, though Streaming usually handles it
            // client.user.setStatus('online'); 

        } catch (error) {
            console.error('Presence Rotation Error:', error);
        }
    }, 15000); // 15 seconds
};
