// src/handlers/eventHandler.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    
    const loadEvents = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                loadEvents(filePath);
            } else if (file.endsWith('.js')) {
                try {
                    const event = require(filePath);
                    if (event.name && event.execute) {
                        if (event.once) {
                            client.once(event.name, (...args) => event.execute(client, ...args));
                        } else {
                            client.on(event.name, (...args) => event.execute(client, ...args));
                        }
                        logger.info(`Event loaded: ${event.name} (${file})`);
                    }
                } catch (error) {
                    logger.error(`Error loading event ${file}:`, error);
                }
            }
        }
    };

    if (fs.existsSync(eventsPath)) {
        loadEvents(eventsPath);
    }
};
