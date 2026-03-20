const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { count, lastMsgTime, messages: [] }

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
    let spamMessages = [];

    // --- DETECTIONS ---
    
    // 1. Antispam (Check first to collect messages)
    const antispam = config.moderation.antispam;
    if (antispam?.enabled && !isWhitelisted(antispam)) {
        const guildMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildMap.get(message.author.id) || { count: 0, lastMsgTime: Date.now(), messages: [] };

        const limit = antispam.limit || 5;
        const time = (antispam.time || 5) * 1000; // Convert to ms (assuming seconds from command +antispam 5/3)

        // Add current message to tracking
        userData.messages.push(message);

        if (Date.now() - userData.lastMsgTime > time) {
             userData.count = 1;
             userData.lastMsgTime = Date.now();
             userData.messages = [message]; // Reset message list for new window
        } else {
             userData.count++;
        }
        
        guildMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildMap);

        if (userData.count >= limit) {
            triggeredType = "spam";
            reason = await t('automod.reason_spam', message.guild.id);
            spamMessages = [...userData.messages]; // Copy messages to delete
            userData.count = 0;
            userData.messages = [];
        }
    }

    // 2. Links & Invites
    if (!triggeredType) {
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
    }

    // 3. Everyone/Here
    if (!triggeredType && (message.content.includes('@everyone') || message.content.includes('@here'))) {
        triggeredType = "everyone";
        reason = await t('automod.reason_everyone', message.guild.id);
    }

    // 4. Mass Mention
    const massmention = config.moderation.massmention;
    if (!triggeredType && massmention?.enabled && !isWhitelisted(massmention)) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > (massmention.limit || 5)) {
            triggeredType = "mention";
            reason = await t('automod.reason_mention', message.guild.id, { count: mentions });
        }
    }

    // 5. Caps
    if (!triggeredType) {
        const caps = message.content.replace(/[^A-Z]/g, "").length;
        if (message.content.length > 15 && (caps / message.content.length) > 0.7) {
            triggeredType = "caps";
            reason = await t('automod.reason_caps', message.guild.id);
        }
    }

    // 6. Badwords
    const badwords = config.moderation.badwords;
    if (!triggeredType && badwords?.enabled && !isWhitelisted(badwords)) {
        const content = message.content.toLowerCase();
        if (badwords.list?.some(word => content.includes(word.toLowerCase()))) {
            triggeredType = "badwords";
            reason = await t('automod.reason_badwords', message.guild.id);
        }
    }

    // --- ACTION ---
    if (triggeredType) {
        // 1. Delete message(s) immediately
        if (triggeredType === 'spam' && spamMessages.length > 0) {
            // Delete all collected spam messages
            for (const msg of spamMessages) {
                if (msg.deletable) await msg.delete().catch(() => {});
            }
        } else {
            if (message.deletable) await message.delete().catch(() => {});
        }
        
        // 2. Send warning message
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        // 3. Find flag config to see how many flags to give
        let flag = flags.find(f => f.type === triggeredType && f.enabled);
        
        // Fallback: Treat 'invite' as 'link' if no specific invite flag is set
        if (!flag && triggeredType === 'invite') {
            flag = flags.find(f => f.type === 'link' && f.enabled);
        }

        const amountToGive = flag ? flag.amount : 1; 

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
