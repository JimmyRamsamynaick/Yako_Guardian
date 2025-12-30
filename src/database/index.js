const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'database.sqlite'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

function initDatabase() {
    // Guild Settings
    db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            raid_log_channel TEXT,
            raid_ping_role TEXT,
            antitoken_level TEXT DEFAULT 'off', -- off, on, lock
            antitoken_limit INTEGER DEFAULT 5,
            antitoken_time INTEGER DEFAULT 10000,
            
            -- Modules state: off, on, max
            antiupdate TEXT DEFAULT 'off',
            antichannel TEXT DEFAULT 'off',
            antirole TEXT DEFAULT 'off',
            antiwebhook TEXT DEFAULT 'off',
            antiunban TEXT DEFAULT 'off',
            antibot TEXT DEFAULT 'off',
            antiban TEXT DEFAULT 'off',
            antieveryone TEXT DEFAULT 'off',
            antideco TEXT DEFAULT 'off',

            -- Extra settings
            antirole_danger TEXT DEFAULT 'all', -- danger, all
            blrank_state TEXT DEFAULT 'off', -- off, on, max
            blrank_type TEXT DEFAULT 'all', -- danger, all
            
            punition_antiraid TEXT DEFAULT 'kick', -- derank, kick, ban
            punition_all TEXT DEFAULT 'kick', -- derank, kick, ban

            creation_limit_time INTEGER DEFAULT 0 -- 0 = disabled
        )
    `);

    // Limits configuration (e.g. max 3 bans per 10s)
    db.exec(`
        CREATE TABLE IF NOT EXISTS module_limits (
            guild_id TEXT,
            module TEXT, -- antiban, antieveryone, antideco, etc.
            limit_count INTEGER,
            limit_time INTEGER, -- milliseconds
            PRIMARY KEY (guild_id, module)
        )
    `);

    // Whitelist
    db.exec(`
        CREATE TABLE IF NOT EXISTS whitelists (
            guild_id TEXT,
            user_id TEXT,
            level TEXT DEFAULT 'wl', -- wl, owner?
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    // Global Blacklist (Bot-wide or Server-specific? Prompt implies bot features but usually BL is global or per server. 
    // "Blacklist Rank" suggests a feature to blacklist users based on rank? Or a global blacklist.
    // Given "+blrank <on/off/max>" it seems to be a module that checks against a blacklist.
    // I'll assume a local blacklist table for now, or a global one if intended.
    // Let's make it per guild for now unless specified otherwise, but "Blacklist Rank" sounds like "Blacklist Managers". 
    // Wait, "+blrank <add/del> <membre>" -> This likely adds people to the blacklist.
    db.exec(`
        CREATE TABLE IF NOT EXISTS blacklists (
            guild_id TEXT,
            user_id TEXT,
            reason TEXT,
            PRIMARY KEY (guild_id, user_id)
        )
    `);
    
    console.log('Database initialized successfully.');
}

module.exports = {
    db,
    initDatabase
};
