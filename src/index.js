// src/index.js
const { loadEnv, getEnvStatus } = require('./utils/loadEnv');
const envStatus = loadEnv();

// D'abord : installer safeMongo (monkey-patch mongoose), AVANT tout require() qui
// référence un modèle mongoose. Ça garantit que TOUS les modèles ont timeout + fallback
// et ZERO "buffering timed out" en Uncaught Exception.
try {
    require('./database/safeMongo').install();
    console.log('[Boot] safeMongo installé avant chargement des modules.');
} catch (safeErr) {
    console.warn('[Boot] Échec installation safeMongo (non critique):', safeErr.message);
}

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initDatabase } = require('./database');
const { connectMongo, isMongoReady } = require('./database/mongo');
const { startServer } = require('./website/app');
const logger = require('./utils/logger');

async function bootstrap() {
    console.log('[Boot] Démarrage Yako Guardian...');
    console.log(`[Boot] cwd=${process.cwd()}`);
    console.log(`[Boot] .env MONGO_URI=${envStatus.hasMongoUri} MONGODB_URI=${envStatus.hasMongodbUri} (alias OK=${Boolean(envStatus.mongoUri)})`);

    initDatabase();
    startServer();

    let mongoOk = false;
    try {
        mongoOk = await Promise.race([
            connectMongo().then((ok) => Boolean(ok && isMongoReady())),
            new Promise((resolve) => setTimeout(() => resolve(false), 20000).unref?.())
        ]);
    } catch (bootError) {
        console.error('[Boot] Échec initialisation MongoDB:', bootError);
        logger.error('Échec initialisation MongoDB:', bootError);
        mongoOk = false;
    }

    if (!mongoOk) {
        console.warn('[Boot] MongoDB inaccessible. Le bot démarre en mode dégradé (commandes + SQLite OK, Mongo modules fallback).');
        logger.warn('MongoDB inaccessible au démarrage : démarrage en mode dégradé.');
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

        registerGlobalCommands(client).catch((err) => {
            console.warn('[Boot] registerGlobalCommands échoué (non critique):', err.message);
            logger.warn(`registerGlobalCommands échoué: ${err.message}`);
        });

        setInterval(() => checkTempRoles(client).catch(err => logger.warn(`checkTempRoles failed: ${err.message}`)), 60 * 1000);
        setInterval(() => checkAutoBackups(client).catch(err => logger.warn(`checkAutoBackups failed: ${err.message}`)), 10 * 60 * 1000);
        setInterval(() => checkReminders(client).catch(err => logger.warn(`checkReminders failed: ${err.message}`)), 30 * 1000);
        setInterval(() => checkTwitch(client).catch(err => logger.warn(`checkTwitch failed: ${err.message}`)), 60 * 1000);
        setInterval(() => checkPfp(client).catch(err => logger.warn(`checkPfp failed: ${err.message}`)), 60 * 60 * 1000);
        setInterval(() => checkSanctions(client).catch(err => logger.warn(`checkSanctions failed: ${err.message}`)), 60 * 1000);
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
    try {
        logger.error('Unhandled Rejection', { reason: String(reason), stack: reason?.stack });
    } catch (_) { /* ignore */ }
});

process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    try {
        logger.error('Uncaught Exception:', { message: err?.message, stack: err?.stack });
    } catch (_) { /* ignore */ }
    // On laisse tourner quand c'est recoverable, mais exit(1) si erreur mémoire / réseau non rattrapable ? Non :
    // on préfère garder le bot vivant pour les modules hors Mongo.
    const recoverableErrors = ['buffering timed out', 'Operation ', 'MongoServerSelectionError', 'ETIMEDOUT', 'ENOTFOUND', 'ECONN'];
    const isRecoverable = recoverableErrors.some(token => String(err?.message || '').includes(token));
    if (!isRecoverable) process.exit(1);
});
