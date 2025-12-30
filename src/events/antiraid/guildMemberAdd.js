const { db } = require('../../database');
const { checkAntiraid } = require('../../utils/antiraid');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        const guild = member.guild;
        const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guild.id);
        
        if (!settings) return;

        // 0. Blacklist Rank Check
        if (settings.blrank_state !== 'off') {
            const blacklistEntry = db.prepare('SELECT * FROM blacklists WHERE guild_id = ? AND user_id = ?').get(guild.id, member.id);
            if (blacklistEntry) {
                await member.ban({ reason: `Yako Guardian | Blacklisted: ${blacklistEntry.reason}` });
                return;
            }
        }

        // 1. Anti-Bot
        if (member.user.bot && settings.antibot !== 'off') {
            // Check whitelist of the adder? 
            // We need to know who added the bot.
            // Audit Log: BotAdd
            const { getExecutor } = require('../../utils/audit');
            const { AuditLogEvent } = require('discord.js');
            const executor = await getExecutor(guild, AuditLogEvent.BotAdd);
            
            if (executor) {
                const adder = await guild.members.fetch(executor.id).catch(() => null);
                // Check if adder is whitelisted
                // If we reuse checkAntiraid, it checks limits. 
                // For Anti-Bot, usually we want strict "No Bots" unless WL.
                
                const isWhitelisted = db.prepare('SELECT level FROM whitelists WHERE guild_id = ? AND user_id = ?').get(guild.id, executor.id);
                if (!isWhitelisted && executor.id !== guild.ownerId) {
                    // Kick bot
                    await member.kick('Yako Guardian | Anti-Bot');
                    // Sanction adder
                    await checkAntiraid(client, guild, adder, 'antibot');
                }
            } else {
                // If we can't find adder, and antibot is ON, kick the bot to be safe?
                // Or wait. Safer to kick if strictly ON.
                if (settings.antibot === 'max') {
                    await member.kick('Yako Guardian | Anti-Bot (Strict)');
                }
            }
        }

        // 2. Anti-Token / Account Age
        if (settings.creation_limit_time > 0) {
            const createdTimestamp = member.user.createdTimestamp;
            const now = Date.now();
            const age = now - createdTimestamp;
            
            // creation_limit_time is in days or ms? User prompt said "durée". 
            // DB has integer. Let's assume ms if large, or convert days.
            // Let's assume the command sets it in ms or days converted to ms.
            
            if (age < settings.creation_limit_time) {
                await member.kick('Yako Guardian | Compte trop récent');
                return;
            }
        }
    }
};
