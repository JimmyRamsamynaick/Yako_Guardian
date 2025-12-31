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

            creation_limit_time INTEGER DEFAULT 0, -- 0 = disabled

            -- Modmail
            modmail_enabled TEXT DEFAULT 'off', -- off, on
            modmail_category TEXT -- Category ID
        )
    `);

    // Active Modmail Tickets
    db.exec(`
        CREATE TABLE IF NOT EXISTS active_tickets (
            user_id TEXT,
            guild_id TEXT,
            channel_id TEXT,
            PRIMARY KEY (user_id, guild_id)
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

    // Command Permissions Overrides
    db.exec(`
        CREATE TABLE IF NOT EXISTS command_permissions (
            guild_id TEXT,
            command_name TEXT,
            permission TEXT, -- Administrator, ManageMessages, etc. OR '0' (Everyone), '-1' (Disabled)
            PRIMARY KEY (guild_id, command_name)
        )
    `);

    // Subscriptions
    db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            guild_id TEXT PRIMARY KEY,
            expires_at INTEGER
        )
    `);

    // License Keys
    db.exec(`
        CREATE TABLE IF NOT EXISTS license_keys (
            key_code TEXT PRIMARY KEY,
            duration_days INTEGER,
            created_at INTEGER,
            used_by TEXT, -- guild_id
            used_at INTEGER
        )
    `);

    const columns = db.prepare(`PRAGMA table_info(guild_settings)`).all();
    const hasModmail = columns.some(c => c.name === 'modmail_enabled');
    const hasModmailCategory = columns.some(c => c.name === 'modmail_category');
    const hasTheme = columns.some(c => c.name === 'theme_color');
    const hasEmbedBanner = columns.some(c => c.name === 'embed_banner');
    const hasVoiceChannel = columns.some(c => c.name === 'voice_channel');
    const hasLanguage = columns.some(c => c.name === 'language');
    const hasCustomLang = columns.some(c => c.name === 'custom_lang_url');
    const hasHelpAlias = columns.some(c => c.name === 'help_alias_enabled');
    const hasHelpType = columns.some(c => c.name === 'help_type');

    if (!hasModmail) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN modmail_enabled TEXT DEFAULT 'off'`);
    }
    if (!hasModmailCategory) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN modmail_category TEXT`);
    }
    if (!hasTheme) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN theme_color TEXT DEFAULT '#2b2d31'`);
    }
    if (!hasEmbedBanner) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN embed_banner TEXT`);
    }
    if (!hasVoiceChannel) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN voice_channel TEXT`);
    }
    if (!hasLanguage) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN language TEXT DEFAULT 'fr'`);
    }
    if (!hasCustomLang) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN custom_lang_url TEXT`);
    }
    if (!hasHelpAlias) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN help_alias_enabled TEXT DEFAULT 'on'`);
    }
    if (!hasHelpType) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN help_type TEXT DEFAULT 'select'`);
    }

    const hasBotStatus = columns.some(c => c.name === 'bot_status');
    const hasBotActivityType = columns.some(c => c.name === 'bot_activity_type');
    const hasBotActivityText = columns.some(c => c.name === 'bot_activity_text');
    const hasBotActivityUrl = columns.some(c => c.name === 'bot_activity_url');

    if (!hasBotStatus) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN bot_status TEXT`);
    }
    if (!hasBotActivityType) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN bot_activity_type TEXT`);
    }
    if (!hasBotActivityText) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN bot_activity_text TEXT`);
    }
    if (!hasBotActivityUrl) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN bot_activity_url TEXT`);
    }
}

module.exports = { initDatabase, db };
