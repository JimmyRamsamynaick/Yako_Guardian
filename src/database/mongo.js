const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

let connectingPromise = null;
let listenersAttached = false;

// Fail fast instead of silent 10s buffering timeouts
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

function isMongoReady() {
    return mongoose.connection.readyState === 1;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function maskUri(uri) {
    if (!uri) return '(vide)';
    try {
        return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:***@');
    } catch (_) {
        return '(uri invalide)';
    }
}

function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    mongoose.connection.on('connected', () => {
        console.log('[MongoDB] connected');
        logger.info('MongoDB connected');
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] disconnected');
        logger.warn('MongoDB déconnecté.');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] reconnected');
        logger.info('MongoDB reconnecté.');
    });
    mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] error:', err.message || err);
        logger.error('Erreur MongoDB:', err.message || err);
    });
}

/**
 * Wait until MongoDB is connected (or timeout).
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function ensureMongoReady(timeoutMs = 10000) {
    if (isMongoReady()) return true;

    if (connectingPromise) {
        try {
            await connectingPromise;
        } catch (_) { /* ignore */ }
        return isMongoReady();
    }

    // Try to (re)connect if nothing is in progress
    try {
        await connectMongo();
    } catch (_) { /* ignore */ }
    return isMongoReady();
}

/**
 * Connect to MongoDB with retries. Resolves true on success, false otherwise.
 */
async function connectMongo() {
    if (isMongoReady()) {
        console.log('[MongoDB] déjà connecté');
        return true;
    }
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        console.log(`[MongoDB] URI: ${maskUri(uri)}`);

        if (!uri) {
            const msg = 'MONGO_URI absente du .env — MongoDB requis pour démarrer.';
            console.error(`[MongoDB] ${msg}`);
            logger.error(msg);
            return false;
        }

        attachListeners();

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[MongoDB] tentative ${attempt}/${MAX_RETRIES}...`);
                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 8000,
                    connectTimeoutMS: 8000,
                    socketTimeoutMS: 45000,
                    maxPoolSize: 10
                });

                // Verify the connection actually works
                await mongoose.connection.db.admin().command({ ping: 1 });

                console.log('[MongoDB] Connecté et ping OK');
                logger.info('Connecté à MongoDB avec succès.');
                return true;
            } catch (error) {
                console.error(`[MongoDB] Échec (${attempt}/${MAX_RETRIES}):`, error.message);
                logger.error(`Échec connexion MongoDB (${attempt}/${MAX_RETRIES}): ${error.message}`);
                try {
                    if (mongoose.connection.readyState !== 0) {
                        await mongoose.disconnect();
                    }
                } catch (_) { /* ignore */ }
                if (attempt < MAX_RETRIES) {
                    await wait(RETRY_DELAY_MS * attempt);
                }
            }
        }

        console.error('[MongoDB] Impossible de se connecter après plusieurs tentatives.');
        console.error('[MongoDB] Vérifiez: MONGO_URI, IP whitelist Atlas (0.0.0.0/0 ou IP du VPS), mot de passe.');
        return false;
    })();

    try {
        return await connectingPromise;
    } finally {
        if (!isMongoReady()) connectingPromise = null;
    }
}

module.exports = {
    connectMongo,
    isMongoReady,
    ensureMongoReady
};
