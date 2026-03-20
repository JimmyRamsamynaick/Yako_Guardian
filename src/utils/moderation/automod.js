const UserStrike = require('../../database/models/UserStrike');
const { isBotOwner } = require('../ownerUtils');
const { applyPunishment } = require('./punishmentSystem');
const { t } = require('../i18n');
const { createEmbed } = require('../design');
const ms = require('ms');

const spamMap = new Map(); // guildId -> userId -> { count, lastMsgTime }

async function checkAutomod(client, message, config) {
    if (!config.moderation) return false;
    const { antispam, antilink, badwords, massmention, flags } = config.moderation;
    
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

    // 1. Badwords
    if (badwords?.enabled && badwords.list?.length > 0 && !isWhitelisted(badwords)) {
        const content = message.content.toLowerCase();
        if (badwords.list.some(word => content.includes(word.toLowerCase()))) {
            triggeredType = "badwords";
            reason = await t('automod.reason_badwords', message.guild.id);
        }
    }

    // 2. Antilink & Invites
    if (!triggeredType && antilink?.enabled && !isWhitelisted(antilink)) {
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

    // 3. Everyone/Here
    if (!triggeredType && (message.content.includes('@everyone') || message.content.includes('@here'))) {
        triggeredType = "everyone";
        reason = await t('automod.reason_everyone', message.guild.id);
    }

    // 4. Mass Mention
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
        if (message.content.length > 10 && (caps / message.content.length) > 0.7) {
            triggeredType = "caps";
            reason = await t('automod.reason_caps', message.guild.id);
        }
    }

    // 6. Antispam (Basic)
    if (!triggeredType && antispam?.enabled && !isWhitelisted(antispam)) {
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
            triggeredType = "spam";
            reason = await t('automod.reason_spam', message.guild.id);
            // Reset count to avoid instant re-trigger
            userData.count = 0;
        }
    }

    if (triggeredType) {
        // Find if there's a specific flag for this type
        const flag = flags?.find(f => f.type === triggeredType && f.enabled);
        
        if (message.deletable) await message.delete().catch(() => {});
        
        const warning = await t('automod.warning', message.guild.id, { user: message.author, reason });
        
        let title = "AutoMod";
        if (triggeredType === 'link' || triggeredType === 'invite') title = await t('moderation.antilink_title', message.guild.id);
        else if (triggeredType === 'badwords') title = await t('moderation.badwords_title', message.guild.id);
        else if (triggeredType === 'spam') title = await t('moderation.antispam_title', message.guild.id);
        else if (triggeredType === 'everyone' || triggeredType === 'mention') title = await t('moderation.massmention_title', message.guild.id);

        const warningMsg = await message.channel.send({ embeds: [createEmbed(title, warning, 'moderation')] });
        setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

        // Apply Flag Sanction
        if (flag) {
            try {
                let actionTaken = "";
                const reasonText = `[Flag: ${triggeredType.toUpperCase()}] ${reason}`;

                switch (flag.action) {
                    case 'warn':
                        // Add strikes (amount)
                        const strikesToAdd = Array(flag.amount || 1).fill({ reason: reasonText, moderatorId: client.user.id, type: triggeredType });
                        
                        const oldData = await UserStrike.findOne({ guildId: message.guild.id, userId: message.author.id });
                        const oldTotal = oldData?.strikes?.length || 0;

                        const updated = await UserStrike.findOneAndUpdate(
                            { guildId: message.guild.id, userId: message.author.id },
                            { $push: { strikes: { $each: strikesToAdd } } },
                            { upsert: true, new: true }
                        );
                        
                        actionTaken = await t('moderation.action_warned', message.guild.id);
                        // Check for total strikes punishments (pass old and new)
                        const totalStrikes = updated.strikes.length;
                        const result = await applyPunishment(client, message.guild, message.member, totalStrikes, oldTotal);
                        if (result) actionTaken = result;
                        break;
                    
                    case 'mute':
                        const muteRoleId = config.moderation.muteRole;
                        if (muteRoleId && message.member.manageable) {
                            const role = message.guild.roles.cache.get(muteRoleId);
                            if (role) await message.member.roles.add(role, reasonText);
                            actionTaken = await t('moderation.action_muted', message.guild.id);
                        }
                        break;

                    case 'timeout':
                        if (flag.duration && message.member.moderatable) {
                            await message.member.timeout(flag.duration, reasonText);
                            actionTaken = await t('moderation.action_timeout', message.guild.id, { duration: ms(flag.duration) });
                        }
                        break;

                    case 'kick':
                        if (message.member.kickable) {
                            await message.member.kick(reasonText);
                            actionTaken = await t('moderation.action_kicked', message.guild.id);
                        }
                        break;

                    case 'ban':
                        if (message.member.bannable) {
                            await message.member.ban({ reason: reasonText });
                            actionTaken = await t('moderation.action_banned', message.guild.id);
                        }
                        break;
                }

                // Log the action if possible
                // (Optional: send to log channel)
            } catch (e) {
                console.error("Failed to apply flag sanction:", e);
            }
        } else {
            // Default: 1 Strike if no flag configured
            try {
                const oldData = await UserStrike.findOne({ guildId: message.guild.id, userId: message.author.id });
                const oldTotal = oldData?.strikes?.length || 0;

                const updated = await UserStrike.findOneAndUpdate(
                    { guildId: message.guild.id, userId: message.author.id },
                    { $push: { strikes: { reason, moderatorId: client.user.id, type: triggeredType } } },
                    { upsert: true, new: true }
                );
                await applyPunishment(client, message.guild, message.member, updated.strikes.length, oldTotal);
            } catch (e) {
                console.error("Failed to add default strike:", e);
            }
        }
        
        return true;
    }

    return false;
}

module.exports = { checkAutomod };
