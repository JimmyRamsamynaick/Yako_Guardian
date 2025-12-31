const { db } = require('../../database');
const { AuditLogEvent, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../logger');
const { checkSubscription } = require('../subscription');

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
    const reason = `Yako Guardian | Anti-Raid: ${reasonModule}`;

    try {
        if (sanctionType === 'ban') {
            if (member.bannable) {
                // Delete messages from the last 7 days (604800 seconds)
                await member.ban({ deleteMessageSeconds: 604800, reason });
                logAction(guild, "🚫 Membre Banni", `**Utilisateur:** ${member.user.tag} (<@${member.id}>)\n**Raison:** ${reasonModule}`, "#FF0000", settings);
            } else {
                 logAction(guild, "⚠️ Sanction Échouée", `Impossible de bannir ${member.user.tag}.\n**Raison:** ${reasonModule}\n**Erreur:** Permissions insuffisantes ou hiérarchie.`, "#FF0000", settings);
            }
        } else if (sanctionType === 'kick') {
            if (member.kickable) {
                await member.kick(reason);
                logAction(guild, "👢 Membre Expulsé", `**Utilisateur:** ${member.user.tag} (<@${member.id}>)\n**Raison:** ${reasonModule}`, "#FFA500", settings);
            } else {
                 logAction(guild, "⚠️ Sanction Échouée", `Impossible d'expulser ${member.user.tag}.\n**Raison:** ${reasonModule}\n**Erreur:** Permissions insuffisantes ou hiérarchie.`, "#FFA500", settings);
            }
        } else if (sanctionType === 'derank') {
            // Remove all roles
            const roles = member.roles.cache.filter(r => r.name !== '@everyone' && r.editable);
            if (roles.size > 0) {
                await member.roles.remove(roles, reason);
                logAction(guild, "📉 Membre Derank", `**Utilisateur:** ${member.user.tag} (<@${member.id}>)\n**Raison:** ${reasonModule}`, "#FFFF00", settings);
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
                .setTitle(`⚠️ ALERTE SÉCURITÉ | ${title}`)
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
            if (iconURL) {
                 embed.setFooter({ text: 'Yako Guardian Security', iconURL: iconURL });
            } else {
                 embed.setFooter({ text: 'Yako Guardian Security' });
            }

            channel.send({ content: content || null, embeds: [embed] }).catch((err) => {
                 console.error("Failed to send log:", err);
            });
        }
    }
}

module.exports = { checkAntiraid };
