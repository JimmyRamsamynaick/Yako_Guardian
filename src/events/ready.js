// src/events/ready.js
const logger = require('../utils/logger');
const { checkGiveaways } = require('../handlers/giveawayHandler');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.info(`Logged in as ${client.user.tag}`);
        client.user.setActivity('Yako Guardian | +help');

        // Giveaway Check Interval (every 30 seconds)
        setInterval(() => {
            checkGiveaways(client);
        }, 30000);
    },
};
