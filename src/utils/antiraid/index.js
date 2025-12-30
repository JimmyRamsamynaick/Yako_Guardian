const { db } = require('../../database');
const { AuditLogEvent, PermissionsBitField } = require('discord.js');
const logger = require('../logger');

// Cache for rate limits: guildId_userId_module -> { count, expires }
const limitCache = new Map();

async function checkAntiraid(client, guild, member, moduleName, type = 'action') {
    if (!guild || !member) return false;

    // 1. Check Whitelist
    const isWhitelisted = db.prepare('SELECT level FROM whitelists WHERE guild_id = ? AND user_id = ?').get(guild.id, member.id);
    if (isWhitelisted) return false; // Allowed

    // 2. Check Owner
    if (member.id === guild.ownerId) return false;

    // 3. Get Module Settings
    const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guild.id);
    if (!settings) return false;

    const moduleState = settings[moduleName];
    if (moduleState === 'off') return false;

    // 4. Check Limits (if applicable)
    // If moduleState is 'max', we might skip limits and act immediately, or strict limits.
    // Let's assume 'max' means stricter or immediate action, but for now we treat 'on' and 'max' similarly regarding limits, 
    // maybe 'max' implies 1 action is enough.
    
    // Get custom limits
    const limitConfig = db.prepare('SELECT * FROM module_limits WHERE guild_id = ? AND module = ?').get(guild.id, moduleName);
    
    // Defaults
    let maxCount = limitConfig ? limitConfig.limit_count : 3;
    let timeWindow = limitConfig ? limitConfig.limit_time : 10000; // 10s

    if (moduleState === 'max') {
        maxCount = 1; // Strict mode
        timeWindow = 60000;
    }

    const key = `${guild.id}_${member.id}_${moduleName}`;
    const now = Date.now();

    let userData = limitCache.get(key);
    if (!userData || userData.expires < now) {
        userData = { count: 0, expires: now + timeWindow };
    }

    userData.count++;
    limitCache.set(key, userData);

    if (userData.count > maxCount) {
        // Trigger Sanction
        limitCache.delete(key); // Reset to avoid spamming sanctions
        await executeSanction(client, guild, member, settings, moduleName);
        return true; // Action taken
    }

    return false;
}

async function executeSanction(client, guild, member, settings, reasonModule) {
    const sanctionType = settings.punition_antiraid || 'kick';
    const reason = `Yako Guardian | Anti-Raid: ${reasonModule}`;

    try {
        if (sanctionType === 'ban') {
            if (member.bannable) {
                await member.ban({ reason });
                logAction(guild, `🚫 **Membre Banni**\nUtilisateur: ${member.user.tag}\nRaison: ${reasonModule}`, settings);
            }
        } else if (sanctionType === 'kick') {
            if (member.kickable) {
                await member.kick(reason);
                logAction(guild, `👢 **Membre Expulsé**\nUtilisateur: ${member.user.tag}\nRaison: ${reasonModule}`, settings);
            }
        } else if (sanctionType === 'derank') {
            // Remove all roles
            const roles = member.roles.cache.filter(r => r.name !== '@everyone' && r.editable);
            await member.roles.remove(roles, reason);
            logAction(guild, `📉 **Membre Derank**\nUtilisateur: ${member.user.tag}\nRaison: ${reasonModule}`, settings);
        }
    } catch (err) {
        logger.error(`Failed to sanction ${member.user.tag}:`, err);
    }
}

async function logAction(guild, content, settings) {
    if (settings.raid_log_channel) {
        const channel = guild.channels.cache.get(settings.raid_log_channel);
        if (channel) {
            // NO EMBED -> Text
            let msg = `⚠️ **ALERTE SÉCURITÉ**\n${content}`;
            if (settings.raid_ping_role) {
                msg += `\n<@&${settings.raid_ping_role}>`;
            }
            channel.send(msg).catch(() => {});
        }
    }
}

module.exports = { checkAntiraid };
