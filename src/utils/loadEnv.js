const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

/**
 * Load .env from project root and normalize Mongo URI aliases.
 * Accepts either MONGO_URI or MONGODB_URI (both are kept in sync).
 */
function loadEnv() {
    if (loaded) return getEnvStatus();

    const envPath = path.join(__dirname, '..', '..', '.env');
    dotenv.config({ path: envPath });

    // Bidirectional alias so code and .env can use either name
    if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
        process.env.MONGO_URI = process.env.MONGODB_URI;
    }
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
        process.env.MONGODB_URI = process.env.MONGO_URI;
    }

    loaded = true;
    return getEnvStatus();
}

function getMongoUri() {
    return process.env.MONGO_URI || process.env.MONGODB_URI || null;
}

function getEnvStatus() {
    return {
        envPath: path.join(__dirname, '..', '..', '.env'),
        mongoUri: getMongoUri(),
        hasMongoUri: Boolean(process.env.MONGO_URI),
        hasMongodbUri: Boolean(process.env.MONGODB_URI),
        hasToken: Boolean(process.env.TOKEN)
    };
}

module.exports = {
    loadEnv,
    getMongoUri,
    getEnvStatus
};
