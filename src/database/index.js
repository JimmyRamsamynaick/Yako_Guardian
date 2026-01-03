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
            sanction TEXT, -- kick, ban, derank, mute, warn
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
    const hasPunitionAntiraid = columns.some(c => c.name === 'punition_antiraid');
    const hasPunitionAll = columns.some(c => c.name === 'punition_all');
    const hasCreationLimit = columns.some(c => c.name === 'creation_limit_time');

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
    if (!hasPunitionAntiraid) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN punition_antiraid TEXT DEFAULT 'kick'`);
    }
    if (!hasPunitionAll) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN punition_all TEXT DEFAULT 'kick'`);
    }
    if (!hasCreationLimit) {
        db.exec(`ALTER TABLE guild_settings ADD COLUMN creation_limit_time INTEGER DEFAULT 0`);
    }

    const hasBotStatus = columns.some(c => c.name === 'bot_status');
    const hasBotActivityType = columns.some(c => c.name === 'bot_activity_type');
    const hasBotActivityText = columns.some(c => c.name === 'bot_activity_text');
    const hasBotActivityUrl = columns.some(c => c.name === 'bot_activity_url');

    // Missing Antiraid Columns Migration
    const hasRaidLogChannel = columns.some(c => c.name === 'raid_log_channel');
    const hasRaidPingRole = columns.some(c => c.name === 'raid_ping_role');
    const hasAntiTokenLevel = columns.some(c => c.name === 'antitoken_level');
    const hasAntiTokenLimit = columns.some(c => c.name === 'antitoken_limit');
    const hasAntiTokenTime = columns.some(c => c.name === 'antitoken_time');
    
    const hasAntiUpdate = columns.some(c => c.name === 'antiupdate');
    const hasAntiChannel = columns.some(c => c.name === 'antichannel');
    const hasAntiRole = columns.some(c => c.name === 'antirole');
    const hasAntiWebhook = columns.some(c => c.name === 'antiwebhook');
    const hasAntiUnban = columns.some(c => c.name === 'antiunban');
    const hasAntiBot = columns.some(c => c.name === 'antibot');
    const hasAntiBan = columns.some(c => c.name === 'antiban');
    const hasAntiEveryone = columns.some(c => c.name === 'antieveryone');
    const hasAntiDeco = columns.some(c => c.name === 'antideco');
    
    const hasAntiRoleDanger = columns.some(c => c.name === 'antirole_danger');
    const hasBlRankState = columns.some(c => c.name === 'blrank_state');
    const hasBlRankType = columns.some(c => c.name === 'blrank_type');

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

    // Apply Antiraid Migrations
    if (!hasRaidLogChannel) db.exec(`ALTER TABLE guild_settings ADD COLUMN raid_log_channel TEXT`);
    if (!hasRaidPingRole) db.exec(`ALTER TABLE guild_settings ADD COLUMN raid_ping_role TEXT`);
    if (!hasAntiTokenLevel) db.exec(`ALTER TABLE guild_settings ADD COLUMN antitoken_level TEXT DEFAULT 'off'`);
    if (!hasAntiTokenLimit) db.exec(`ALTER TABLE guild_settings ADD COLUMN antitoken_limit INTEGER DEFAULT 5`);
    if (!hasAntiTokenTime) db.exec(`ALTER TABLE guild_settings ADD COLUMN antitoken_time INTEGER DEFAULT 10000`);

    if (!hasAntiUpdate) db.exec(`ALTER TABLE guild_settings ADD COLUMN antiupdate TEXT DEFAULT 'off'`);
    if (!hasAntiChannel) db.exec(`ALTER TABLE guild_settings ADD COLUMN antichannel TEXT DEFAULT 'off'`);
    if (!hasAntiRole) db.exec(`ALTER TABLE guild_settings ADD COLUMN antirole TEXT DEFAULT 'off'`);
    if (!hasAntiWebhook) db.exec(`ALTER TABLE guild_settings ADD COLUMN antiwebhook TEXT DEFAULT 'off'`);
    if (!hasAntiUnban) db.exec(`ALTER TABLE guild_settings ADD COLUMN antiunban TEXT DEFAULT 'off'`);
    if (!hasAntiBot) db.exec(`ALTER TABLE guild_settings ADD COLUMN antibot TEXT DEFAULT 'off'`);
    if (!hasAntiBan) db.exec(`ALTER TABLE guild_settings ADD COLUMN antiban TEXT DEFAULT 'off'`);
    if (!hasAntiEveryone) db.exec(`ALTER TABLE guild_settings ADD COLUMN antieveryone TEXT DEFAULT 'off'`);
    if (!hasAntiDeco) db.exec(`ALTER TABLE guild_settings ADD COLUMN antideco TEXT DEFAULT 'off'`);

    if (!hasAntiRoleDanger) db.exec(`ALTER TABLE guild_settings ADD COLUMN antirole_danger TEXT DEFAULT 'all'`);
    if (!hasBlRankState) db.exec(`ALTER TABLE guild_settings ADD COLUMN blrank_state TEXT DEFAULT 'off'`);
    if (!hasBlRankType) db.exec(`ALTER TABLE guild_settings ADD COLUMN blrank_type TEXT DEFAULT 'all'`);
}

module.exports = { initDatabase, db };
