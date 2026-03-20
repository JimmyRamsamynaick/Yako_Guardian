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
    const antilink = config.moderation.antilink;
    if (antilink?.enabled && !isWhitelisted(antilink)) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)/i;
        const linkRegex = /https?:\/\/[^\s]+/i;
        
        if (inviteRegex.test(message.content)) {
            triggeredType = "invite";
            reason = await t('automod.reason_invite', message.guild.id);
        } else if (antilink.mode === 'all' && linkRegex.test(message.content)) {
            triggeredType = "link";
            reason = await t('automod.reason_link', message.guild.id);
        }
    }

    // 2. Everyone/Here
    if (!triggeredType && (message.content.includes('@everyone') || message.content.includes('@here'))) {
        triggeredType = "everyone";
        reason = await t('automod.reason_everyone', message.guild.id);
    }

    // 3. Mass Mention
    const massmention = config.moderation.massmention;
    if (!triggeredType && massmention?.enabled && !isWhitelisted(massmention)) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > (massmention.limit || 5)) {
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
    const badwords = config.moderation.badwords;
    if (!triggeredType && badwords?.enabled && !isWhitelisted(badwords)) {
        const content = message.content.toLowerCase();
        if (badwords.list?.some(word => content.includes(word.toLowerCase()))) {
            triggeredType = "badwords";
            reason = await t('automod.reason_badwords', message.guild.id);
        }
    }

    // 6. Antispam
    const antispam = config.moderation.antispam;
    if (!triggeredType && antispam?.enabled && !isWhitelisted(antispam)) {
        const guildMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildMap.get(message.author.id) || { count: 0, lastMsgTime: Date.now() };
        const limit = antispam.limit || 5;
        const time = antispam.time || 5000;

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
        // 1. Delete message immediately
        if (message.deletable) await message.delete().catch(() => {});
        
        // 2. Send warning message
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        // 3. Find flag config to see how many flags to give
        const flag = flags.find(f => f.type === triggeredType && f.enabled);
        const amountToGive = flag ? flag.amount : 1; // Default to 1 if no flag config found but module is enabled

        try {
            const reasonText = `[AutoMod: ${triggeredType.toUpperCase()}] ${reason}`;

            const oldData = await UserStrike.findOne({ guildId: message.guild.id, userId: message.author.id });
            const oldTotal = oldData?.strikes?.length || 0;

            const strikesToAdd = Array(amountToGive).fill({ reason: reasonText, moderatorId: client.user.id, type: triggeredType });

            const updated = await UserStrike.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { $push: { strikes: { $each: strikesToAdd } } },
                { upsert: true, new: true }
            );
            
            // 4. Apply punishments based on NEW total
            await applyPunishment(client, message.guild, message.member, updated.strikes.length, oldTotal);
            
        } catch (e) {
            console.error("Failed to apply AutoMod action:", e);
        }
        
        return true;
    }

    return false;
}

module.exports = { checkAutomod };
