// src/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initDatabase } = require('./database');
const connectMongo = require('./database/mongo');
const { startServer } = require('./website/app');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Initialize Database & Web Server
initDatabase();
connectMongo();
startServer();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
client.aliases = new Collection();
client.config = {
    prefix: '+' // Default prefix
};

// Handlers
const handlers = ['commandHandler', 'eventHandler', 'componentHandler', 'formHandler'];
handlers.forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

const { checkTempRoles } = require('./utils/tempRoleSystem');
const { checkAutoBackups } = require('./utils/backupSystem');

// Ready Event
client.once('ready', () => {
    logger.info(`Logged in as ${client.user.tag}`);
    
    // Start TempRole checker loop (every 60s)
    setInterval(() => checkTempRoles(client), 60 * 1000);

    // Start AutoBackup checker loop (every 1 hour? or 10 mins?)
    // 10 minutes seems reasonable.
    setInterval(() => checkAutoBackups(client), 10 * 60 * 1000);
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
