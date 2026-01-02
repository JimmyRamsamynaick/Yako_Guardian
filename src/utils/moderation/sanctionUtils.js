const mongoose = require('mongoose');
const Sanction = require('../../database/models/Sanction');

/**
 * Adds a sanction to the database
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} moderatorId 
 * @param {string} type 
 * @param {string} reason 
 * @param {number} duration (optional)
 * @param {string} channelId (optional - for cmute)
 * @returns {Promise<Document>}
 */
async function addSanction(guildId, userId, moderatorId, type, reason, duration = null, channelId = null) {
    // Get next case ID
    // Note: This is a simple implementation. For high traffic, use findOneAndUpdate on a Counter model.
    const lastSanction = await Sanction.findOne({ guildId }).sort({ caseId: -1 });
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

    return await sanction.save();
}

async function getSanctions(guildId, userId) {
    return await Sanction.find({ guildId, userId }).sort({ caseId: -1 });
}

async function deleteSanction(guildId, caseId) {
    return await Sanction.findOneAndDelete({ guildId, caseId });
}

async function clearSanctions(guildId, userId) {
    return await Sanction.deleteMany({ guildId, userId });
}

async function clearAllSanctions(guildId) {
    return await Sanction.deleteMany({ guildId });
}

module.exports = {
    addSanction,
    getSanctions,
    deleteSanction,
    clearSanctions,
    clearAllSanctions
};
