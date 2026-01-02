const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');

const spamMap = new Map(); // guildId -> userId -> { count, lastMsgTime }

async function checkAutomod(client, message, config) {
    if (!config.moderation) return false;
    const { antispam, antilink, badwords, massmention } = config.moderation;
    
    // Ignore permissions (Admins usually ignored)
    if (await isBotOwner(message.author.id)) return false;
    if (message.author.id === message.guild.ownerId) return false;
    if (message.member.permissions.has('Administrator')) return false; 

    // Helper for whitelist check (channels/roles)
    const isWhitelisted = (setting) => {
        if (!setting) return false;
        if (setting.ignoredChannels && setting.ignoredChannels.includes(message.channel.id)) return true;
        if (setting.ignoredRoles && message.member.roles.cache.some(r => setting.ignoredRoles.includes(r.id))) return true;
        return false;
    };

    let triggered = false;
    let reason = "";
    let type = "manual";

    // 1. Badwords
    if (badwords?.enabled && badwords.list?.length > 0 && !isWhitelisted(badwords)) {
        const content = message.content.toLowerCase();
        if (badwords.list.some(word => content.includes(word.toLowerCase()))) {
            triggered = true;
            reason = await t('automod.reason_badwords', message.guild.id);
            type = "badwords";
        }
    }

    // 2. Antilink
    if (!triggered && antilink?.enabled && !isWhitelisted(antilink)) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)/i;
        const linkRegex = /https?:\/\/[^\s]+/i;
        
        if (antilink.mode === 'invite' && inviteRegex.test(message.content)) {
            triggered = true;
            reason = await t('automod.reason_invite', message.guild.id);
            type = "antilink";
        } else if (antilink.mode === 'all' && linkRegex.test(message.content)) {
            triggered = true;
            reason = await t('automod.reason_link', message.guild.id);
            type = "antilink";
        }
    }

    // 3. Antispam (Basic)
    if (!triggered && antispam?.enabled && !isWhitelisted(antispam)) {
        const guildMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildMap.get(message.author.id) || { count: 0, lastMsgTime: Date.now() };

        const limit = antispam.limit || 5;
        const time = antispam.time || 5000;

        // If time window passed, reset
        if (Date.now() - userData.lastMsgTime > time) {
             userData.count = 1;
             userData.lastMsgTime = Date.now();
        } else {
             userData.count++;
        }

        guildMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildMap);

        if (userData.count > limit) {
            triggered = true;
            reason = await t('automod.reason_spam', message.guild.id);
            type = "antispam";
            // Reset count to avoid instant re-trigger
            userData.count = 0;
        }
    }

    if (triggered) {
        if (message.deletable) await message.delete().catch(() => {});
        
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        const warningMsg = await message.channel.send({ embeds: [createEmbed(warning, '', 'error')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        // Add Strike
        try {
            await UserStrike.updateOne(
                { guildId: message.guild.id, userId: message.author.id },
                { $push: { strikes: { reason, moderatorId: client.user.id, type } } },
                { upsert: true }
            );

            // Check for punishments
            await applyPunishment(client, message, message.author.id, config);

        } catch (e) {
            console.error("Failed to add strike:", e);
        }
        
        return true;
    }

    return false;
}

module.exports = { checkAutomod };
