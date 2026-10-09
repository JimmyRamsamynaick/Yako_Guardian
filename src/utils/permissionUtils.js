const { PermissionsBitField } = require('discord.js');

const SAFE_COMMANDS = [
    'wiki', 'search', 'help', 'helpall', 'calc', 'image', 'leaderboard', 'lb',
    'rep', 'rank', 'profile', 'user', 'userinfo', 'server', 'serverinfo',
    'botinfo', 'ping', 'support', 'suggestion', 'poll', 'afk',
    'remind', 'reminder', 'translate', 'weather', 'avatar', 'pic', 'member',
    'members', 'buy', 'subscription', 'store', 'premium'
];

const CATEGORY_LEVEL_MAP = Object.freeze({
    owner: 10,
    antiraid: 5,
    secur: 5,
    security: 5,
    backups: 5,
    configuration: 4,
    administration: 4,
    automations: 4,
    moderation: 3,
    modmail: 3,
    tickets: 2,
    roles: 1,
    community: 1,
    utils: 1,
    voice: 1,
    notifications: 1,
    suggestion: 1,
    custom: 1,
    auto: 4,
    general: 0,
    owner: 10
});

function roleHasAny(member, ids = []) {
    if (!member?.roles?.cache) return false;
    const cache = member.roles.cache;
    for (const id of ids) {
        if (cache.has(id)) return true;
    }
    return false;
}

/**
 * Determines the required permission level for a command.
 * @param {Object} command The command object.
 * @returns {number} The required level (0-10).
 */
function getCommandLevel(command) {
    // 1. Explicit Permission Level
    if (typeof command?.permLevel === 'number') {
        return command.permLevel;
    }

    // 2. Safe Commands (Level 0)
    if (command && SAFE_COMMANDS.includes(command.name)) {
        return 0;
    }

    const cat = command?.category ? String(command.category).toLowerCase() : 'general';

    if (CATEGORY_LEVEL_MAP[cat] !== undefined) {
        return CATEGORY_LEVEL_MAP[cat];
    }

    // Fallback absolu : unknown est ouvert (tout le monde) comme General
    return 0;
}

/**
 * Calculates the user's permission level.
 * @param {GuildMember} member The guild member.
 * @param {Object} config The guild configuration.
 * @param {boolean} isOwner Whether the user is the bot owner.
 * @returns {number} The user's level (0-10).
 */
function getUserLevel(member, config, isOwner) {
    if (isOwner) return 10;
    if (!member) return 0;
    if (member.id === member.guild?.ownerId) return 5;

    let userLevel = 0;

    // Check Configured Levels
    if (config?.permissionLevels) {
        for (let i = 5; i >= 1; i--) {
            const ids = config.permissionLevels[String(i)] || [];
            if (ids.includes(member.id) || roleHasAny(member, ids)) {
                if (i > userLevel) userLevel = i;
                break; // Optimization: Found highest level
            }
        }
    }

    return userLevel;
}

module.exports = {
    getCommandLevel,
    getUserLevel,
    SAFE_COMMANDS,
    roleHasAny
};
