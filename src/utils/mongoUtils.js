const GuildConfig = require('../database/models/GuildConfig');
const { isMongoReady, ensureMongoReady } = require('../database/mongo');
const logger = require('./logger');

/**
 * Gets or creates the guild config.
 * Returns null if MongoDB is unavailable (never throws buffering timeouts).
 * @param {string} guildId
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getGuildConfig(guildId) {
    if (!guildId) return null;

    try {
        if (!isMongoReady()) {
            const ready = await ensureMongoReady(5000);
            if (!ready) {
                logger.warn(`getGuildConfig: MongoDB indisponible (guild=${guildId})`);
                return null;
            }
        }

        return await GuildConfig.findOneAndUpdate(
            { guildId },
            { $setOnInsert: { guildId } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        logger.warn(`getGuildConfig failed (${guildId}): ${error.message}`);
        return null;
    }
}

module.exports = { getGuildConfig };
