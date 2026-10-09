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
                        const bind = event.once ? 'once' : 'on';
                        const handler = (...args) => event.execute(client, ...args);
                        client[bind](event.name, handler);
                        // Bridge ready <-> clientReady (Discord.js v14/v15), without double-bind loops
                        if (event.name === 'clientReady') {
                            client[bind]('ready', handler);
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
