// src/handlers/eventHandler.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    
    if (!fs.existsSync(eventsPath)) return;

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const event = require(path.join(eventsPath, file));
            const eventName = file.split('.')[0];
            
            if (event.once) {
                client.once(eventName, (...args) => event.execute(client, ...args));
            } else {
                client.on(eventName, (...args) => event.execute(client, ...args));
            }
            
            logger.info(`Event loaded: ${eventName}`);
        } catch (error) {
            logger.error(`Error loading event ${file}:`, error);
        }
    }
};
