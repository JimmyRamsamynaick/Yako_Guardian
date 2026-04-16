const { db } = require('../../database');

/**
 * Check if a user or their roles are whitelisted in a guild
 * @param {string} guildId 
 * @param {GuildMember} member 
 * @returns {boolean}
 */
function isWhitelisted(guildId, member) {
    if (!member) return false;
    
    // Check if user ID is whitelisted
    const userWl = db.prepare('SELECT 1 FROM whitelists WHERE guild_id = ? AND user_id = ?').get(guildId, member.id);
    if (userWl) return true;

    // Check if any of the member's roles are whitelisted
    if (member.roles && member.roles.cache) {
        const roleIds = member.roles.cache.map(r => r.id);
        if (roleIds.length > 0) {
            const placeholders = roleIds.map(() => '?').join(',');
            const roleWl = db.prepare(`SELECT 1 FROM whitelists WHERE guild_id = ? AND user_id IN (${placeholders})`).get(guildId, ...roleIds);
            if (roleWl) return true;
        }
    }

    return false;
}

/**
 * Check if a user or their roles are blacklisted in a guild
 * @param {string} guildId 
 * @param {GuildMember} member 
 * @returns {boolean}
 */
function isBlacklisted(guildId, member) {
    if (!member) return false;

    // Check if user ID is blacklisted
    const userBl = db.prepare('SELECT 1 FROM blacklists WHERE guild_id = ? AND user_id = ?').get(guildId, member.id);
    if (userBl) return true;

    // Check if any of the member's roles are blacklisted
    if (member.roles && member.roles.cache) {
        const roleIds = member.roles.cache.map(r => r.id);
        if (roleIds.length > 0) {
            const placeholders = roleIds.map(() => '?').join(',');
            const roleBl = db.prepare(`SELECT 1 FROM blacklists WHERE guild_id = ? AND user_id IN (${placeholders})`).get(guildId, ...roleIds);
            if (roleBl) return true;
        }
    }

    return false;
}

module.exports = {
    isWhitelisted,
    isBlacklisted
};
