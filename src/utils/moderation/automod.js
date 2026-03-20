const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { messages: [] }
const raidMap = new Map(); // guildId -> channelId -> { messages: [] }

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
    
    // 1. Antispam (INDIVIDUAL & RAID)
    const antispam = config.moderation.antispam;
    if (antispam?.enabled && !isWhitelisted(antispam)) {
        const limit = antispam.limit || 5;
        const timeWindow = (antispam.time || 5) * 1000; 
        const now = message.createdTimestamp;

        // --- A. INDIVIDUAL SPAM ---
        const guildSpamMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildSpamMap.get(message.author.id) || { messages: [] };
        
        userData.messages = userData.messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
        if (!userData.messages.find(m => m.id === message.id)) userData.messages.push(message);
        
        guildSpamMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildSpamMap);

        if (userData.messages.length >= limit) {
            triggeredType = "spam";
            reason = await t('automod.reason_spam', message.guild.id);
            spamMessages = [...userData.messages]; 
            userData.messages = [];
            guildSpamMap.set(message.author.id, userData);
        }

        // --- B. RAID DETECTION (Global channel spam) ---
        if (!triggeredType) {
            const guildRaidMap = raidMap.get(message.guild.id) || new Map();
            const channelData = guildRaidMap.get(message.channel.id) || { messages: [] };

            channelData.messages = channelData.messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
            if (!channelData.messages.find(m => m.id === message.id)) channelData.messages.push(message);

            guildRaidMap.set(message.channel.id, channelData);
            raidMap.set(message.guild.id, guildRaidMap);

            // If the total messages in channel exceeds 2x the individual limit in the same time
            // Or if it exceeds a hard threshold (e.g., 10 messages in 3s by multiple people)
            const raidLimit = Math.max(limit * 2, 8); 
            if (channelData.messages.length >= raidLimit) {
                triggeredType = "raid";
                reason = "AutoMod: Raid / Global Spam detected";
                spamMessages = [...channelData.messages];
                channelData.messages = [];
                guildRaidMap.set(message.channel.id, channelData);
            }
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
        // Double-check whitelist with correct module name mapping
        const moduleMap = {
            'spam': 'antispam',
            'invite': 'antilink',
            'link': 'antilink',
            'mention': 'massmention'
        };
        const moduleName = moduleMap[triggeredType] || triggeredType;
        if (isWhitelisted(config.moderation[moduleName])) return false;

        // 1. Delete message(s) immediately
        if (triggeredType === 'spam' && spamMessages.length > 0) {
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
