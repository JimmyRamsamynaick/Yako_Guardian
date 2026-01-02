const { db } = require('../../database');
const { AuditLogEvent, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../logger');
const { checkSubscription } = require('../subscription');
const { t } = require('../i18n');

// Cache for rate limits: guildId_userId_module -> { count, expires }
const limitCache = new Map();

async function checkAntiraid(client, guild, member, moduleName, type = 'action') {
    if (!guild || !member) return false;

    // Check Subscription
    if (!checkSubscription(guild.id)) return false;

    // 0. Ignore Bot itself
    if (member.id === client.user.id) return false;

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
        maxCount = 0; // Strict mode: 0 actions allowed (Trigger on 1st attempt)
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
        // If module is 'max', we enforce BAN sanction (override default)
        const sanctionOverride = moduleState === 'max' ? 'ban' : null;
        
        // Do NOT reset cache to ensure continued blocking during the window
        // limitCache.delete(key); 
        await executeSanction(client, guild, member, settings, moduleName, sanctionOverride);
        return true; // Action taken
    }

    return false;
}

async function executeSanction(client, guild, member, settings, reasonModule, sanctionOverride = null) {
    const sanctionType = sanctionOverride || settings.punition_antiraid || 'kick';
    const reason = await t('antiraid.reason_prefix', guild.id, { module: reasonModule });

    try {
        if (sanctionType === 'ban') {
            if (member.bannable) {
                // Delete messages from the last 7 days (604800 seconds)
                await member.ban({ deleteMessageSeconds: 604800, reason });
                await logAction(guild, await t('antiraid.handler.banned', guild.id), await t('antiraid.handler.banned_desc', guild.id, { tag: member.user.tag, id: member.id, reason: reasonModule }), "#FF0000", settings);
            } else {
                 await logAction(guild, await t('antiraid.handler.failed', guild.id), await t('antiraid.handler.ban_failed_desc', guild.id, { tag: member.user.tag, reason: reasonModule }), "#FF0000", settings);
            }
        } else if (sanctionType === 'kick') {
            if (member.kickable) {
                await member.kick(reason);
                await logAction(guild, await t('antiraid.handler.kicked', guild.id), await t('antiraid.handler.kicked_desc', guild.id, { tag: member.user.tag, id: member.id, reason: reasonModule }), "#FFA500", settings);
            } else {
                 await logAction(guild, await t('antiraid.handler.failed', guild.id), await t('antiraid.handler.kick_failed_desc', guild.id, { tag: member.user.tag, reason: reasonModule }), "#FFA500", settings);
            }
        } else if (sanctionType === 'derank') {
            // Remove all roles
            const roles = member.roles.cache.filter(r => r.name !== '@everyone' && r.editable);
            if (roles.size > 0) {
                await member.roles.remove(roles, reason);
                await logAction(guild, await t('antiraid.handler.deranked', guild.id), await t('antiraid.handler.deranked_desc', guild.id, { tag: member.user.tag, id: member.id, reason: reasonModule }), "#FFFF00", settings);
            } else {
                // If no roles removed, maybe because none were editable
                // logAction(guild, `⚠️ **Sanction Incomplète**\nAucun rôle retiré à ${member.user.tag} (Hiérarchie).`, settings);
            }
        }
    } catch (err) {
        logger.error(`Failed to sanction ${member.user.tag}:`, err);
    }
}

async function logAction(guild, title, description, color, settings) {
    if (settings.raid_log_channel) {
        const channel = guild.channels.cache.get(settings.raid_log_channel);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(await t('antiraid.log_title', guild.id, { title }))
                .setDescription(description)
                .setColor(color)
                .setTimestamp();
                // .setFooter handled below

            let content = '';
            if (settings.raid_ping_role) {
                content = `<@&${settings.raid_ping_role}>`;
            }
            
            // Check if content is empty string, if so pass null to avoid "Cannot send empty message" error if embed is also missing (unlikely)
            // But send method with empty content and embed is valid.
            // Wait, previous code was: channel.send({ content: content || null, embeds: [embed] })
            
            // Ensure iconURL is valid string or null
            const iconURL = guild.iconURL();
            const footerText = await t('antiraid.footer', guild.id);
            if (iconURL) {
                 embed.setFooter({ text: footerText, iconURL: iconURL });
            } else {
                 embed.setFooter({ text: footerText });
            }

            channel.send({ content: content || null, embeds: [embed] }).catch((err) => {
                 console.error("Failed to send log:", err);
            });
        }
    }
}

module.exports = { checkAntiraid };
