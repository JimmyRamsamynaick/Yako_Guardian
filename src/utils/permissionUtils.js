const { PermissionsBitField } = require('discord.js');

const SAFE_COMMANDS = [
    'wiki', 'search', 'help', 'helpall', 'calc', 'image', 'leaderboard', 'lb', 
    'rep', 'rank', 'profile', 'user', 'userinfo', 'server', 'serverinfo', 
    'botinfo', 'ping', 'support', 'suggestion', 'poll', 'afk', 
    'remind', 'reminder', 'translate', 'weather', 'avatar', 'pic', 'member', 
    'members', 'buy', 'subscription', 'store', 'premium'
];

/**
 * Determines the required permission level for a command.
 * @param {Object} command The command object.
 * @returns {number} The required level (0-10).
 */
function getCommandLevel(command) {
    // 1. Explicit Permission Level
    if (command.permLevel !== undefined) {
        return command.permLevel;
    }

    // 2. Safe Commands (Level 0)
    if (SAFE_COMMANDS.includes(command.name)) {
        return 0;
    }

    const cat = command.category ? command.category.toLowerCase() : 'general';

    // 3. Category Mapping
    if (cat === 'owner') return 10;
    
    // Level 5: Security, Antiraid, Backups (Critical)
    if (cat === 'antiraid' || cat === 'secur' || cat === 'security' || cat === 'backups' || command.name === 'backup') return 5;
    
    // Level 4: Configuration, Administration, Automations (High Admin)
    if (cat === 'configuration' || cat === 'administration' || cat === 'automations') return 4;

    // Level 3: Moderation, Modmail (Moderators)
    if (cat === 'moderation' || cat === 'modmail') return 3;
    
    // Level 2: Tickets (Support)
    if (cat === 'tickets') return 2;

    // Level 1: Roles, Community (Helpers/Active Members)
    if (cat === 'roles' || cat === 'community') return 1;

    // Utils: Default to Level 1 or 0? 
    // User said "que de 1 à 5". Safe commands are 0.
    // Let's put remaining Utils in Level 1 or 2.
    // Let's go with Level 1 for general utility/info that isn't purely safe/spammy.
    if (cat === 'utils') return 1; 

    // General category fallback
    // If it wasn't safe, it's likely a config or admin command in General
    return 4; 
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
    if (member.id === member.guild.ownerId) return 5;

    let userLevel = 0;
    
    // Check Configured Levels
    if (config.permissionLevels) {
        for (let i = 5; i >= 1; i--) {
            const ids = config.permissionLevels[i.toString()] || [];
            if (ids.includes(member.id) || member.roles.cache.hasAny(...ids)) {
                if (i > userLevel) userLevel = i;
                break; // Optimization: Found highest level
            }
        }
    }

    // Fallback for Administrator (Level 4) REMOVED per user request
    // if (userLevel < 4 && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    //    userLevel = 4;
    // }

    return userLevel;
}

module.exports = {
    getCommandLevel,
    getUserLevel,
    SAFE_COMMANDS
};
