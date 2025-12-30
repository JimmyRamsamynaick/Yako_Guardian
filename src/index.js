// src/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initDatabase } = require('./database');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Initialize Database
initDatabase();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
client.aliases = new Collection();
client.config = {
    prefix: '+' // Default prefix
};

// Handlers
const handlers = ['commandHandler', 'eventHandler', 'componentHandler'];
handlers.forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

client.login(process.env.TOKEN).catch(err => {
    logger.error('Failed to login:', err);
});

// Global error handling
process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
});
