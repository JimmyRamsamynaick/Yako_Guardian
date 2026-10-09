// src/events/ready.js
const logger = require('../utils/logger');
const { checkGiveaways } = require('../handlers/giveawayHandler');
const { checkTwitchStreams } = require('../services/twitchService');

let readyHandled = false;

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        if (readyHandled) return;
        readyHandled = true;

        const { ActivityType } = require('discord.js');
        client.user.setActivity('sur les personnes malveillantes', {
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/jimmy_9708'
        });

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
