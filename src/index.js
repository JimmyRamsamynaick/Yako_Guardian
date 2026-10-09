// src/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initDatabase } = require('./database');
const { connectMongo, isMongoReady } = require('./database/mongo');
const { startServer } = require('./website/app');
const logger = require('./utils/logger');

async function bootstrap() {
    console.log('[Boot] Démarrage Yako Guardian...');
    console.log(`[Boot] cwd=${process.cwd()}`);
    console.log(`[Boot] MONGO_URI définie=${Boolean(process.env.MONGO_URI || process.env.MONGODB_URI)}`);

    initDatabase();
    startServer();

    // MongoDB must be ready before Discord login
    const mongoOk = await connectMongo();
    if (!mongoOk || !isMongoReady()) {
        console.error('[Boot] ABORT: MongoDB inaccessible. Le bot ne démarre pas.');
        logger.error('Impossible de démarrer : MongoDB inaccessible. Vérifiez MONGO_URI et le réseau/Atlas.');
        process.exit(1);
    }

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
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.DirectMessages
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
    });

    client.commands = new Collection();
    client.aliases = new Collection();
    client.snipes = new Collection();
    client.config = {
        prefix: '+'
    };

    const handlers = ['commandHandler', 'eventHandler', 'componentHandler', 'formHandler'];
    handlers.forEach(handler => {
        require(`./handlers/${handler}`)(client);
    });

    require('./handlers/presenceHandler')(client);

    const { checkTempRoles } = require('./utils/tempRoleSystem');
    const { checkAutoBackups } = require('./utils/backupSystem');
    const { checkReminders } = require('./utils/reminderSystem');
    const { checkTwitch } = require('./utils/twitchSystem');
    const { checkPfp } = require('./utils/pfpSystem');
    const { checkSanctions } = require('./utils/moderation/sanctionScheduler');
    const { registerGlobalCommands } = require('./utils/registerCommands');

    let readyHandled = false;
    const onReady = () => {
        if (readyHandled) return;
        readyHandled = true;

        logger.info(`Logged in as ${client.user.tag}`);
        console.log(`[Boot] Discord OK | Mongo readyState=${require('mongoose').connection.readyState}`);

        registerGlobalCommands(client);

        setInterval(() => checkTempRoles(client), 60 * 1000);
        setInterval(() => checkAutoBackups(client), 10 * 60 * 1000);
        setInterval(() => checkReminders(client), 30 * 1000);
        setInterval(() => checkTwitch(client), 60 * 1000);
        setInterval(() => checkPfp(client), 60 * 60 * 1000);
        setInterval(() => checkSanctions(client), 60 * 1000);
    };

    // Only clientReady — avoids DeprecationWarning on `ready`
    client.once('clientReady', onReady);
    // Fallback if runtime only emits legacy ready
    client.once('ready', onReady);

    await client.login(process.env.TOKEN);
}

bootstrap().catch(err => {
    console.error('[Boot] Failed to start:', err);
    logger.error('Failed to start:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    logger.error('Unhandled Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    logger.error('Uncaught Exception:', err);
});
