const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { messages: [] }

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
    if (!s1 || !s2) return Math.max(s1?.length || 0, s2?.length || 0);
    if (s1.length < s2.length) return levenshteinDistance(s2, s1);
    if (s2.length === 0) return s1.length;
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currentRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let insertions = previousRow[j + 1] + 1;
            let deletions = currentRow[j] + 1;
            let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[s2.length];
}

/**
 * Calculate a spam score from 0 to 100
 */
async function calculateSpamScore(messages, newMessage, guildId) {
    let score = 0;
    const count = messages.length;
    if (count <= 1) return 0;

    const firstMsg = messages[0];
    const lastMsg = messages[count - 1];
    const duration = lastMsg.createdTimestamp - firstMsg.createdTimestamp;
    
    // 1. Frequency (Flood) - Up to 40 points
    // Base score for message count (each message after the first adds 5 points)
    score += (count - 1) * 8; 

    // Bonus for high frequency
    if (duration > 0) {
        const msPerMsg = duration / (count - 1);
        if (msPerMsg < 600) score += 25; // Very fast (~2 msg/sec)
        else if (msPerMsg < 1200) score += 15; // Fast (~1 msg/sec)
        else if (msPerMsg < 2500) score += 5; // Moderate
    }

    // 2. Repetition & Similarity - Up to 40 points
    let similarityScore = 0;
    for (let i = 0; i < count - 1; i++) {
        const m1 = messages[i].content.trim().toLowerCase();
        const m2 = messages[i+1].content.trim().toLowerCase();
        
        if (!m1 || !m2) continue;

        if (m1 === m2) {
            similarityScore += 20; // Exact match
        } else {
            const distance = levenshteinDistance(m1, m2);
            const maxLength = Math.max(m1.length, m2.length);
            const similarity = 1 - (distance / maxLength);
            if (similarity > 0.85) similarityScore += 15; // Highly similar
            else if (similarity > 0.6) similarityScore += 5; // Somewhat similar
        }
    }
    score += Math.min(similarityScore, 40);

    // 3. Content Suspicousness - Up to 20 points
    const content = newMessage.content;
    const lowerContent = content.toLowerCase();

    // Very short messages in burst ("ok", ".", etc)
    if (content.length > 0 && content.length < 4) score += 10;

    // Repetitive characters (e.g. "heyyyyy")
    const repetitiveChars = /(.)\1{4,}/.test(lowerContent);
    if (repetitiveChars) score += 15;

    // Many emojis
    const emojiCount = (content.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 4) score += 10;

    // Many mentions
    if (newMessage.mentions.users.size > 2) score += 10;

    // Links
    if (/https?:\/\/[^\s]+/.test(content)) score += 10;

    // Bypass attempts (spaces between every letter)
    const words = content.trim().split(/\s+/);
    if (words.length > 3 && words.every(w => w.length === 1)) score += 20;

    // 4. Intelligence contextuelle (Anti-False Positives)
    // If messages are long and varied, reduce score
    if (content.length > 50 && score > 0) {
        score -= 10;
    }

    return Math.min(Math.max(score, 0), 100);
}

/**
 * Helper to apply strikes and punishments
 */
async function applyStrikes(client, message, type, reason, amount) {
    try {
        const reasonText = `[AutoMod: ${type.toUpperCase()}] ${reason}`;
        const oldData = await UserStrike.findOne({ guildId: message.guild.id, userId: message.author.id });
        const oldTotal = oldData?.strikes?.length || 0;

        const strikesToAdd = Array(amount).fill({ 
            reason: reasonText, 
            moderatorId: client.user.id, 
            type: type 
        });

        const updated = await UserStrike.findOneAndUpdate(
            { guildId: message.guild.id, userId: message.author.id },
            { $push: { strikes: { $each: strikesToAdd } } },
            { upsert: true, new: true }
        );
        
        await applyPunishment(client, message.guild, message.member, updated.strikes.length, oldTotal);
        return true;
    } catch (e) {
        console.error("Failed to apply strikes:", e);
        return false;
    }
}

async function checkAutomod(client, message, config) {
    if (!config.moderation) return false;
    const { flags = [] } = config.moderation;
    
    // Ignore permissions (Admins usually ignored)
    if (await isBotOwner(message.author.id)) return false;
    if (message.author.id === message.guild.ownerId) return false;
    
    // TEMPORARY: Allow Admins to be detected for testing purposes
    // if (message.member.permissions.has('Administrator')) return false; 
    
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
    
    // 1. Antispam (INDIVIDUAL SCORING SYSTEM)
    const antispam = config.moderation.antispam;
    if (antispam?.enabled && !isWhitelisted(antispam)) {
        // Use user-defined time window or default to 10s
        const timeWindow = (antispam.time || 10) * 1000; 
        const now = message.createdTimestamp;

        const guildSpamMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildSpamMap.get(message.author.id) || { messages: [] };
        
        // Filter out old messages (Strict Window)
        userData.messages = userData.messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
        
        // Add current message if not already tracked
        if (!userData.messages.find(m => m.id === message.id)) {
            userData.messages.push(message);
        }
        
        guildSpamMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildSpamMap);

        // Analyze score if we have more than 1 message
        if (userData.messages.length > 1) {
            const score = await calculateSpamScore(userData.messages, message, message.guild.id);

            // Get configured flag for spam to use its defined amount
            const spamFlag = flags.find(f => f.type === 'spam' && f.enabled);
            const baseAmount = spamFlag ? spamFlag.amount : 1;

            // LOGIC: 0-40 OK, 40-70 suspect, 70-100 action
            if (score >= 40) {
                triggeredType = "spam";
                spamMessages = [...userData.messages];
                
                if (score < 70) {
                    // SPAM LÉGER / SUSPECT
                    reason = await t('automod.reason_spam_light', message.guild.id, { score });
                    
                    const warning = await t('automod.warning_discrete', message.guild.id, { user: message.author });
                    const warningMsg = await message.channel.send({ content: warning }).catch(() => {});
                    if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 3000);
                    
                    // Give 1 flag (fixed for light spam to avoid over-punishing)
                    await applyStrikes(client, message, 'spam', reason, 1);
                    
                    // Deletion requested for ALL spam types? The prompt said:
                    // Spam léger : Avertissement discret
                    // Spam moyen : Suppression + warning
                    // If the user says "it stays", maybe they want deletion even for light spam?
                    // Let's stick to the prompt for now, but ensure it's NOT an admin.
                    return true; 
                 } else if (score < 85) {
                    // SPAM MOYEN
                    reason = await t('automod.reason_spam_medium', message.guild.id, { score });
                    
                    if (message.deletable) await message.delete().catch(() => {});
                    
                    const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
                    const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] }).catch(() => {});
                    if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

                    // Use baseAmount from config, or 2 if baseAmount is 1
                    const amountToGive = Math.max(baseAmount, 2);

                    await applyStrikes(client, message, 'spam', reason, amountToGive);
                    return true;

                } else {
                    // SPAM ÉLEVÉ
                    reason = await t('automod.reason_spam_heavy', message.guild.id, { score });

                    for (const msg of spamMessages) {
                        if (msg.deletable) await msg.delete().catch(() => {});
                    }

                    userData.messages = [];
                    guildSpamMap.set(message.author.id, userData);

                    const warning = await t('automod.warning_heavy', message.guild.id, { user: message.author });
                    const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] }).catch(() => {});
                    if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

                    // Use baseAmount * 2 or a minimum of 5 to ensure a strong punishment (mute/timeout)
                    const amountToGive = Math.max(baseAmount * 2, 5);

                    await applyStrikes(client, message, 'spam', reason, amountToGive);
                    return true;
                }
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

    // 4. Mass Mention (Advanced Detection)
    const massmention = config.moderation.massmention;
    if (!triggeredType && massmention?.enabled && !isWhitelisted(massmention)) {
        const limit = massmention.limit || 5;
        const now = message.createdTimestamp;

        // Count TOTAL mentions in content (including duplicates of same user/role)
        // Regex: <@ (optional ! or &) followed by ID digits and >
        const mentionRegex = /<@(!?|&)?\d+>/g;
        const mentionsInContent = message.content.match(mentionRegex) || [];
        const currentMentions = mentionsInContent.length;

        // Check for mentions across multiple messages (Sliding window 10s)
        const guildSpamMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildSpamMap.get(message.author.id) || { messages: [] };
        
        // Filter messages from the last 10 seconds, excluding the CURRENT one to avoid double counting
        const recentMessages = userData.messages.filter(msg => msg.id !== message.id && (now - msg.createdTimestamp) < 10000);
        
        let totalRecentMentions = currentMentions;
        recentMessages.forEach(msg => {
            totalRecentMentions += (msg.content.match(mentionRegex) || []).length;
        });

        // TRIGGER: Either many in one message, OR many across several messages
        if (currentMentions >= limit || totalRecentMentions >= (limit * 1.5)) {
            triggeredType = "massmention";
            const count = Math.max(currentMentions, totalRecentMentions);
            reason = await t('automod.reason_mention', message.guild.id, { count });

            // Reset user message buffer to avoid double triggering
            userData.messages = [];
            guildSpamMap.set(message.author.id, userData);
        }
    }

    // 5. Caps
    const anticaps = config.moderation.anticaps;
    if (!triggeredType && anticaps?.enabled && !isWhitelisted(anticaps)) {
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
        // Double-check whitelist
        const moduleMap = {
            'invite': 'antilink',
            'link': 'antilink',
            'massmention': 'massmention'
        };
        const moduleName = moduleMap[triggeredType] || triggeredType;
        if (isWhitelisted(config.moderation[moduleName])) return false;

        // 1. Delete message
        if (message.deletable) await message.delete().catch(() => {});
        
        // 2. Send warning message
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        // 3. Find flag amount
        let flag = flags.find(f => f.type === triggeredType && f.enabled);
        if (!flag && triggeredType === 'invite') flag = flags.find(f => f.type === 'link' && f.enabled);
        
        // Fallback for massmention/mention mismatch
        if (!flag && triggeredType === 'massmention') flag = flags.find(f => f.type === 'mention' && f.enabled);
        
        const amountToGive = flag ? flag.amount : 1; 

        // 4. Apply strikes
        await applyStrikes(client, message, triggeredType, reason, amountToGive);
        
        return true;
    }

    return false;
}

module.exports = { checkAutomod };
