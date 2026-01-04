// src/events/ready.js
const logger = require('../utils/logger');
const { checkGiveaways } = require('../handlers/giveawayHandler');
const { checkTwitchStreams } = require('../services/twitchService');

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

        // Twitch Stream Check Interval (every 2 minutes)
        checkTwitchStreams(client); // Initial check
        setInterval(() => {
            checkTwitchStreams(client);
        }, 120000);
    },
};
