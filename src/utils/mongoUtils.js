const GuildConfig = require('../database/models/GuildConfig');

/**
 * Gets or creates the guild config
 * @param {string} guildId 
 * @returns {Promise<Document>}
 */
async function getGuildConfig(guildId) {
    return await GuildConfig.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

module.exports = { getGuildConfig };
