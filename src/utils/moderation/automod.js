const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { count, lastMsgTime }

async function checkAutomod(client, message, config) {
    if (!config.moderation) return false;
    const { flags = [] } = config.moderation;
    
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

    let triggeredType = null;
    let reason = "";

    // --- DETECTIONS ---
    
    // 1. Links & Invites
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)/i;
    const linkRegex = /https?:\/\/[^\s]+/i;
    
    if (inviteRegex.test(message.content)) {
        triggeredType = "invite";
        reason = await t('automod.reason_invite', message.guild.id);
    } else if (linkRegex.test(message.content)) {
        triggeredType = "link";
        reason = await t('automod.reason_link', message.guild.id);
    }

    // 2. Everyone/Here
    if (!triggeredType && (message.content.includes('@everyone') || message.content.includes('@here'))) {
        triggeredType = "everyone";
        reason = await t('automod.reason_everyone', message.guild.id);
    }

    // 3. Mass Mention
    if (!triggeredType) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > (config.moderation.massmention?.limit || 5)) {
            triggeredType = "mention";
            reason = await t('automod.reason_mention', message.guild.id, { count: mentions });
        }
    }

    // 4. Caps
    if (!triggeredType) {
        const caps = message.content.replace(/[^A-Z]/g, "").length;
        if (message.content.length > 15 && (caps / message.content.length) > 0.7) {
            triggeredType = "caps";
            reason = await t('automod.reason_caps', message.guild.id);
        }
    }

    // 5. Badwords
    if (!triggeredType && config.moderation.badwords?.list?.length > 0) {
        const content = message.content.toLowerCase();
        if (config.moderation.badwords.list.some(word => content.includes(word.toLowerCase()))) {
            triggeredType = "badwords";
            reason = await t('automod.reason_badwords', message.guild.id);
        }
    }

    // 6. Antispam
    if (!triggeredType) {
        const guildMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildMap.get(message.author.id) || { count: 0, lastMsgTime: Date.now() };
        const limit = config.moderation.antispam?.limit || 5;
        const time = config.moderation.antispam?.time || 5000;

        if (Date.now() - userData.lastMsgTime > time) {
             userData.count = 1;
             userData.lastMsgTime = Date.now();
        } else {
             userData.count++;
        }
        guildMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildMap);

        if (userData.count > limit) {
            triggeredType = "spam";
            reason = await t('automod.reason_spam', message.guild.id);
            userData.count = 0;
        }
    }

    // --- ACTION ---
    if (triggeredType) {
        // Check if whitelisted for THIS specific module
        const moduleSettings = config.moderation[triggeredType === 'invite' || triggeredType === 'link' ? 'antilink' : triggeredType];
        if (isWhitelisted(moduleSettings)) return false;

        // Find flag config
        const flag = flags.find(f => f.type === triggeredType && f.enabled);
        if (!flag) return false; // If no flag configured, we do nothing (Simple)

        if (message.deletable) await message.delete().catch(() => {});
        
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        const title = "AutoMod";
        const warningMsg = await message.channel.send({ embeds: [createEmbed(title, warning, 'moderation')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        try {
            const reasonText = `[AutoMod: ${triggeredType.toUpperCase()}] ${reason}`;

            // Add strikes (amount from flag)
            const strikesToAdd = Array(flag.amount || 1).fill({ reason: reasonText, moderatorId: client.user.id, type: triggeredType });
            
            const oldData = await UserStrike.findOne({ guildId: message.guild.id, userId: message.author.id });
            const oldTotal = oldData?.strikes?.length || 0;

            const updated = await UserStrike.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { $push: { strikes: { $each: strikesToAdd } } },
                { upsert: true, new: true }
            );
            
            // Apply punishments based on NEW total
            const totalStrikes = updated.strikes.length;
            await applyPunishment(client, message.guild, message.member, totalStrikes, oldTotal);
            
        } catch (e) {
            console.error("Failed to apply AutoMod action:", e);
        }
        
        return true;
    }

    return false;
}

module.exports = { checkAutomod };
