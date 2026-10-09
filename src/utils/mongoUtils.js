const GuildConfig = require('../database/models/GuildConfig');
const { isMongoReady, ensureMongoReady } = require('../database/mongo');
const logger = require('./logger');

/**
 * Timeout a promise with a friendly reject.
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, label = 'mongo operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            const t = setTimeout(
                () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
                timeoutMs
            );
            if (typeof t.unref === 'function') t.unref();
        })
    ]);
}

function buildFallbackGuildConfig(guildId) {
    return {
        guildId,
        prefix: '+',
        autoPublish: false,
        autoPublishChannels: [],
        logs: {
            mod: { enabled: false, channelId: null },
            message: { enabled: false },
            voice: { enabled: false },
            boost: { enabled: false },
            role: { enabled: false },
            raid: { enabled: false },
            server: { enabled: false },
            member: { enabled: false }
        },
        moderation: {
            logChannel: null,
            muteRole: null,
            timeoutEnabled: true,
            antispam: { enabled: false },
            antilink: { enabled: false },
            badwords: { enabled: false },
            anticaps: { enabled: false },
            massmention: { enabled: false },
            strikes: {},
            flags: []
        },
        automations: {
            autothread: { enabled: false, channels: [] },
            autoslowmode: { enabled: false }
        },
        community: {
            levels: { enabled: false }
        },
        permissionLevels: {
            '1': [],
            '2': [],
            '3': [],
            '4': [],
            '5': []
        },
        toJSON() { return this; },
        save() { return Promise.resolve(this); },
        __fallback: true
    };
}

/**
 * Gets or creates the guild config.
 * Returns a safe fallback object if MongoDB is unavailable (never throws buffering timeouts).
 * @param {string} guildId
 * @returns {Promise<import('mongoose').Document|object>}
 */
async function getGuildConfig(guildId) {
    if (!guildId) return buildFallbackGuildConfig(null);

    try {
        if (!isMongoReady()) {
            const ready = await ensureMongoReady(3000);
            if (!ready) {
                logger.warn(`[mongoUtils] MongoDB indisponible, fallback config pour guild=${guildId}`);
                return buildFallbackGuildConfig(guildId);
            }
        }

        // Do NOT chain .lean() here: safeMongo may wrap queries; keep a real Document.
        const doc = await withTimeout(
            GuildConfig.findOneAndUpdate(
                { guildId },
                { $setOnInsert: { guildId } },
                { upsert: true, new: true, setDefaultsOnInsert: true, maxTimeMS: 4000 }
            ),
            5000,
            `getGuildConfig(${guildId})`
        );

        return doc || buildFallbackGuildConfig(guildId);
    } catch (error) {
        logger.warn(`[mongoUtils] getGuildConfig failed (${guildId}) → fallback: ${error.message}`);
        return buildFallbackGuildConfig(guildId);
    }
}

module.exports = { getGuildConfig };
