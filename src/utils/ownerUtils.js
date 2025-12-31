const BotOwner = require('../database/models/BotOwner');

/**
 * Checks if a user is a bot owner.
 * @param {string} userId - The ID of the user to check.
 * @returns {Promise<boolean>} - True if the user is an owner, false otherwise.
 */
async function isBotOwner(userId) {
    if (userId === process.env.OWNER_ID) return true;
    const owner = await BotOwner.findOne({ userId });
    return !!owner;
}

module.exports = { isBotOwner };
