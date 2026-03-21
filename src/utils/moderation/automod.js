const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { messages: [], lastAction: Date, warningTimestamp: Date, isProcessing: Boolean }
const channelActivityMap = new Map(); // guildId -> channelId -> { lastMessages: [] }

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
 * PRIORITY: Avoid false positives.
 * MODE SURVEILLANCE: Strict evaluation.
 */
async function calculateSpamScore(messages, newMessage, guildId, isUnderSurveillance = false) {
    let score = 0;
    const count = messages.length;
    
    const firstMsg = messages[0] || newMessage;
    const lastMsg = newMessage;
    const duration = lastMsg.createdTimestamp - firstMsg.createdTimestamp;
    
    // --- 1. INTELLIGENCE CONTEXTUELLE (REDUIRE LE SCORE) ---
    
    // A. Interaction Humaine
    const hasReply = messages.some(m => m.type === 19) || newMessage.type === 19; 
    const hasMentions = messages.some(m => m.mentions.users.size > 0) || newMessage.mentions.users.size > 0;
    
    // B. Activité Globale (Plusieurs personnes parlent)
    const guildActivity = channelActivityMap.get(guildId) || new Map();
    const channelActivity = guildActivity.get(newMessage.channel.id) || { lastMessages: [] };
    const uniqueUsers = new Set(channelActivity.lastMessages.map(m => m.authorId)).size;
    
    // C. Variété du contenu
    let totalLength = 0;
    let uniqueContents = new Set();
    messages.forEach(m => {
        totalLength += m.content.length;
        uniqueContents.add(m.content.trim().toLowerCase());
    });
    uniqueContents.add(newMessage.content.trim().toLowerCase());
    
    const varietyRatio = uniqueContents.size / (count + 1);

    // Si discussion active (>= 2 autres personnes), on est très tolérant (SAUF SI SURVEILLANCE)
    if (!isUnderSurveillance) {
        if (uniqueUsers >= 3) return 0; 
        if (uniqueUsers === 2 && !hasReply) score -= 20;
        if (varietyRatio > 0.8 && totalLength > 20) score -= 30; // Discussion variée
    }

    // --- 2. DETECTION DE SPAM (AUGMENTER LE SCORE) ---

    // A. Fréquence (Flood)
    score += (count + 1) * 15; // Augmenté pour plus de réactivité

    if (duration > 0) {
        const msPerMsg = duration / (count || 1);
        if (msPerMsg < 500) score += 50; 
        else if (msPerMsg < 1000) score += 30;
    } else if (isUnderSurveillance) {
        score += 40; // Suspect immédiat en surveillance
    }

    // B. Répétition & Similarité
    let similarityScore = 0;
    const allMessages = [...messages, newMessage];
    for (let i = 0; i < allMessages.length - 1; i++) {
        const m1 = allMessages[i].content.trim().toLowerCase();
        const m2 = allMessages[i+1].content.trim().toLowerCase();
        
        if (!m1 || !m2) continue;

        if (m1 === m2) {
            similarityScore += 35; // Augmenté
        } else {
            const distance = levenshteinDistance(m1, m2);
            const maxLength = Math.max(m1.length, m2.length);
            const similarity = 1 - (distance / maxLength);
            if (similarity > 0.85) similarityScore += 25;
        }
    }
    score += Math.min(similarityScore, 70);

    // C. Rafales Humaines (Pensées découpées) - MOINS DE TOLÉRANCE EN SURVEILLANCE
    if (varietyRatio > 0.7 && totalLength < 50 && count < 5) {
        score -= isUnderSurveillance ? 10 : 50; 
    }

    // D. Cas isolés
    if (uniqueUsers === 1 && count >= 2) score += 20; 

    // --- 3. DECISION FINALE ---
    
    // Si l'utilisateur interagit (réponse/mention), on divise le score par 2 (SAUF SI SURVEILLANCE)
    if (!isUnderSurveillance && (hasReply || hasMentions)) score /= 2;

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
        
        // Trigger punishment system based on panel config
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
    if (message.member.permissions.has('Administrator')) return false; 

    // --- MISE À JOUR DE L'ACTIVITÉ DU SALON ---
    const now = message.createdTimestamp;
    let guildActivity = channelActivityMap.get(message.guild.id);
    if (!guildActivity) {
        guildActivity = new Map();
        channelActivityMap.set(message.guild.id, guildActivity);
    }
    let channelActivity = guildActivity.get(message.channel.id) || { lastMessages: [] };
    
    // On garde les messages des 10 dernières secondes
    channelActivity.lastMessages = channelActivity.lastMessages.filter(m => (now - m.timestamp) < 10000);
    channelActivity.lastMessages.push({ authorId: message.author.id, timestamp: now });
    guildActivity.set(message.channel.id, channelActivity);

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
        const guildSpamMap = spamMap.get(message.guild.id) || new Map();
        const userData = guildSpamMap.get(message.author.id) || { messages: [], lastAction: 0, warningTimestamp: 0, isProcessing: false };
        
        // --- CONCURRENCY LOCK ---
        // If we are already processing an action for this user, ignore subsequent messages for 1s
        if (userData.isProcessing) {
            message.delete().catch(() => {}); // Preemptive delete during processing
            return true;
        }

        // Mode Surveillance renforcée (10s après un warning)
        const isUnderSurveillance = (now - userData.warningTimestamp) < 10000;

        // --- OPTIMISATION CRITIQUE : SUPPRESSION PREEMPTIVE ---
        if (isUnderSurveillance && message.content.length < 5) {
            message.delete().catch(() => {});
        }

        // Fenêtre d'analyse glissante (8s en normal, 4s en surveillance pour être plus nerveux)
        const timeWindow = isUnderSurveillance ? 4000 : 8000; 

        // Anti-spam rapide : si on a agi il y a moins de 2s, on ignore (SAUF SI SURVEILLANCE)
        if (!isUnderSurveillance && (now - userData.lastAction < 2000)) return false;

        // Filter out old messages (Strict window)
        userData.messages = userData.messages.filter(msg => (now - msg.createdTimestamp) < timeWindow);
        
        const score = await calculateSpamScore(userData.messages, message, message.guild.id, isUnderSurveillance);

        // Add current message to history (limit history size to 10)
        if (!userData.messages.find(m => m.id === message.id)) {
            userData.messages.push(message);
            if (userData.messages.length > 10) userData.messages.shift();
        }
        
        guildSpamMap.set(message.author.id, userData);
        spamMap.set(message.guild.id, guildSpamMap);

        // Get config
        const spamFlag = flags.find(f => f.type === 'spam' && f.enabled);
        const baseAmount = spamFlag ? spamFlag.amount : 1;

        // --- ACTIONS ---

        // Cas 1: Récidive immédiate en mode surveillance
        if (isUnderSurveillance && score >= 20) { 
            triggeredType = "spam";
            reason = "[Mode Surveillance] Récidive après avertissement";
            
            // Suppression FORCEE et IMMEDIATE
            message.delete().catch(() => {});
            
            // ACTIVATE CONCURRENCY LOCK
            userData.isProcessing = true;
            userData.warningTimestamp = now; 
            userData.messages = [];
            userData.lastAction = now;
            guildSpamMap.set(message.author.id, userData);

            // OPTIMISATION : On n'ajoute des strikes QUE si l'utilisateur n'est pas déjà mute/timeout
            const isAlreadyPunished = message.member.communicationDisabledUntilTimestamp > now || 
                                     (config.moderation.muteRole && message.member.roles.cache.has(config.moderation.muteRole));

            if (!isAlreadyPunished) {
                await applyStrikes(client, message, 'spam', reason, 3);
            }
            
            // RELEASE LOCK AFTER LATENCY WINDOW
            setTimeout(() => {
                const currentData = guildSpamMap.get(message.author.id);
                if (currentData) {
                    currentData.isProcessing = false;
                    guildSpamMap.set(message.author.id, currentData);
                }
            }, 2000);

            return true;
        }

        // Cas 2: Détection normale
        if (userData.messages.length >= 2 && score >= 55) { 
            triggeredType = "spam";
            spamMessages = [...userData.messages];
            
            // ACTIVATE CONCURRENCY LOCK
            userData.isProcessing = true;
            userData.lastAction = now;
            userData.warningTimestamp = now; 
            
            if (score < 80) {
                // SPAM LÉGER -> WARNING + SURVEILLANCE
                reason = await t('automod.reason_spam_light', message.guild.id, { score });
                
                const warning = await t('automod.warning_discrete', message.guild.id, { user: message.author });
                const warningMsg = await message.channel.send({ content: warning }).catch(() => {});
                if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 3000);
                
                await applyStrikes(client, message, 'spam', reason, 1);
                
                userData.messages = []; 
                guildSpamMap.set(message.author.id, userData);
            } else {
                // SPAM LOURD -> SUPPRESSION + SANCTION
                reason = await t('automod.reason_spam_heavy', message.guild.id, { score });

                if (score > 85) {
                    for (const msg of spamMessages) {
                        if (msg.deletable) await msg.delete().catch(() => {});
                    }
                } else {
                    if (message.deletable) await message.delete().catch(() => {});
                }

                userData.messages = []; 
                guildSpamMap.set(message.author.id, userData);

                const warningKey = score > 85 ? 'automod.warning_heavy' : 'automod.warning';
                const warning = await t(warningKey, message.guild.id, { user: message.author, reason });
                const warningMsg = await message.channel.send({ embeds: [createEmbed("AutoMod", warning, 'moderation')] }).catch(() => {});
                if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

                const amountToGive = score > 85 ? Math.max(baseAmount * 2, 5) : Math.max(baseAmount, 2);
                await applyStrikes(client, message, 'spam', reason, amountToGive);
            }

            // RELEASE LOCK AFTER LATENCY WINDOW
            setTimeout(() => {
                const currentData = guildSpamMap.get(message.author.id);
                if (currentData) {
                    currentData.isProcessing = false;
                    guildSpamMap.set(message.author.id, currentData);
                }
            }, 2000);

            return true;
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
