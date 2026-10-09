const mongoose = require('mongoose');
const Sanction = require('../../database/models/Sanction');
const { isMongoReady, ensureMongoReady } = require('../../database/mongo');
const logger = require('../logger');

/**
 * Adds a sanction to the database. Silently fails & returns null when Mongo is down.
 * Never throws so caller never bubbles uncaught rejection from Mongo buffering issues.
 */
async function addSanction(guildId, userId, moderatorId, type, reason, duration = null, channelId = null) {
    try {
        const ready = isMongoReady() || await ensureMongoReady(1500);
        if (!ready) {
            logger.warn(`[sanctionUtils] MongoDB indisponible: sanction ${type} non persistée pour user=${userId} guild=${guildId}`);
            return null;
        }

        // Get next case ID with timeout to avoid 10s buffering
        const lastSanction = await Promise.race([
            Sanction.findOne({ guildId }).sort({ caseId: -1 }).maxTimeMS(3000),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.findOne timeout')), 5000).unref?.())
        ]).catch(() => null);

        const caseId = lastSanction ? lastSanction.caseId + 1 : 1;

        const sanction = new Sanction({
            guildId,
            userId,
            moderatorId,
            type,
            reason,
            duration,
            channelId,
            caseId,
            active: true
        });

        if (duration) {
            sanction.expiresAt = new Date(Date.now() + duration);
        }

        return await Promise.race([
            sanction.save(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.save timeout')), 5000).unref?.())
        ]);
    } catch (err) {
        logger.warn(`[sanctionUtils] addSanction failed for guild=${guildId} user=${userId} type=${type}: ${err.message}`);
        return null;
    }
}

async function getSanctions(guildId, userId) {
    try {
        const ready = isMongoReady() || await ensureMongoReady(1500);
        if (!ready) return [];
        return await Promise.race([
            Sanction.find({ guildId, userId }).sort({ caseId: -1 }).maxTimeMS(3000),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.find timeout')), 5000).unref?.())
        ]);
    } catch (err) {
        logger.warn(`[sanctionUtils] getSanctions failed: ${err.message}`);
        return [];
    }
}

async function deleteSanction(guildId, caseId) {
    try {
        const ready = isMongoReady() || await ensureMongoReady(1500);
        if (!ready) return null;
        return await Promise.race([
            Sanction.findOneAndDelete({ guildId, caseId }).maxTimeMS(3000),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.delete timeout')), 5000).unref?.())
        ]);
    } catch (err) {
        logger.warn(`[sanctionUtils] deleteSanction failed: ${err.message}`);
        return null;
    }
}

async function clearSanctions(guildId, userId) {
    try {
        const ready = isMongoReady() || await ensureMongoReady(1500);
        if (!ready) return { deletedCount: 0 };
        return await Promise.race([
            Sanction.deleteMany({ guildId, userId }).maxTimeMS(3000),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.deleteMany timeout')), 5000).unref?.())
        ]);
    } catch (err) {
        logger.warn(`[sanctionUtils] clearSanctions failed: ${err.message}`);
        return { deletedCount: 0 };
    }
}

async function clearAllSanctions(guildId) {
    try {
        const ready = isMongoReady() || await ensureMongoReady(1500);
        if (!ready) return { deletedCount: 0 };
        return await Promise.race([
            Sanction.deleteMany({ guildId }).maxTimeMS(3000),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Sanction.deleteMany timeout')), 5000).unref?.())
        ]);
    } catch (err) {
        logger.warn(`[sanctionUtils] clearAllSanctions failed: ${err.message}`);
        return { deletedCount: 0 };
    }
}

module.exports = {
    addSanction,
    getSanctions,
    deleteSanction,
    clearSanctions,
    clearAllSanctions
};
