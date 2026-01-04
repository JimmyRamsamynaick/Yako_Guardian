const GlobalSettings = require('../database/models/GlobalSettings');
const GlobalBlacklist = require('../database/models/GlobalBlacklist');
const { isBotOwner } = require('../utils/ownerUtils');
const logger = require('../utils/logger');
const { AuditLogEvent } = require('discord.js');
const { db } = require('../database');

module.exports = {
    name: 'guildCreate',
    async execute(client, guild) {
        logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

        // Init SQLite Settings
        try {
            db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guild.id);
        } catch (e) {
            logger.error(`Failed to init guild settings for ${guild.id}:`, e);
        }

        // 1. Check Global Blacklist for Server Owner
        const ownerBl = await GlobalBlacklist.findOne({ userId: guild.ownerId });
        if (ownerBl) {
            try {
                await guild.leave();
                logger.info(`Left guild ${guild.name} because owner is blacklisted.`);
            } catch (e) {}
            return;
        }

        // 2. Check Secur Invite
        const settings = await GlobalSettings.findOne({ clientId: client.user.id });
        if (settings && settings.securInvite) {
             // Find who added the bot
             try {
                 const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 1 });
                 const entry = logs.entries.first();
                 if (entry) {
                     const executor = entry.executor;
                     // Allow if executor is Bot Owner or Server Owner
                     if (executor.id !== guild.ownerId && !(await isBotOwner(executor.id))) {
                         await guild.leave();
                         logger.info(`Left guild ${guild.name} (Secur Invite Active). Added by ${executor.tag}.`);
                     }
                 }
             } catch (e) {
                 logger.error(`Error checking audit logs for guild ${guild.id}:`, e);
             }
        }
    }
};
