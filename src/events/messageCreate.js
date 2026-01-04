// src/events/messageCreate.js
const { ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { db } = require('../database');
const AutoReact = require('../database/models/AutoReact');
const { getGuildConfig } = require('../utils/mongoUtils');
const CustomCommand = require('../database/models/CustomCommand');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');
const { getCommandLevel, getUserLevel } = require('../utils/permissionUtils');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        // Debug log to confirm message content intent is working
        // logger.info(`Message received in ${message.channel.name}: ${message.content}`);

        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;

        // AutoReact Check
        try {
            const autoReact = await AutoReact.findOne({ guild_id: message.guild.id, channel_id: message.channel.id });
            if (autoReact && autoReact.emojis.length > 0) {
                for (const emoji of autoReact.emojis) {
                    await message.react(emoji).catch(() => {});
                }
            }
        } catch (e) {
            // Ignore errors (deleted emoji etc)
        }

        // --- Anti-Everyone / Anti-Link Check ---
        const { checkAntiraid } = require('../utils/antiraid');
        
        // Check for mentions OR raw text (to catch spam even without permissions)
        // Regex looks for @everyone or @here
        const hasEveryone = message.mentions.everyone || /@(everyone|here)/i.test(message.content);

        if (hasEveryone) {
             const triggered = await checkAntiraid(client, message.guild, message.member, 'antieveryone');
             if (triggered) {
                 // Delete the trigger message
                 message.delete().catch(() => {});
                 
                 // Attempt to clean up recent messages from this user (Anti-Spam)
                 try {
                     const messages = await message.channel.messages.fetch({ limit: 20 });
                     const userMessages = messages.filter(m => m.author.id === message.author.id);
                     if (userMessages.size > 0) {
                         await message.channel.bulkDelete(userMessages).catch(() => {});
                     }
                 } catch (e) {}
                 
                 return;
             }
        }
        
        // --- End Anti-Raid Check ---

        // Get guild settings (prefix)
        const config = await getGuildConfig(message.guild.id);

        // --- LEVEL SYSTEM ---
        if (config.community?.levels?.enabled) {
            const Level = require('../database/models/Level');
            let userLevel = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });
            if (!userLevel) {
                userLevel = new Level({ guildId: message.guild.id, userId: message.author.id });
            }

            const now = Date.now();
            if (now - userLevel.lastMessageTimestamp > 60000) { // 1 min cooldown
                const xpGain = Math.floor(Math.random() * 10) + 15; // 15-25 XP
                userLevel.xp += xpGain;
                userLevel.lastMessageTimestamp = now;

                const nextLevelXp = 5 * (userLevel.level ** 2) + 50 * userLevel.level + 100;
                if (userLevel.xp >= nextLevelXp) {
                    userLevel.level++;
                    userLevel.xp -= nextLevelXp; // Optional: Keep overflow or reset? Usually accumulate. 
                    // Let's use accumulated XP for rank, but here we just check threshold.
                    // Simplified formula: XP needed for next level = 5*lvl^2 + 50*lvl + 100.
                    // Better: Calculate total XP for level N. 
                    // Let's keep it simple: if current XP > threshold -> Level Up.
                    
                    if (config.community.levels.channelId) {
                        const channel = message.guild.channels.cache.get(config.community.levels.channelId) || message.channel;
                        const msg = config.community.levels.message || await t('level.levelup_default', message.guild.id);
                        const content = msg.replace(/{user}/g, message.author.toString()).replace(/{level}/g, userLevel.level);
                        channel.send(content).catch(() => {});
                    }
                }
                await userLevel.save();
            }
        }
        // --- END LEVEL SYSTEM ---

        // --- AUTO THREAD ---
        if (config.automations?.autothread?.enabled && config.automations.autothread.channels.includes(message.channel.id)) {
            // Create thread
            // Check permissions
            if (message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.CreatePublicThreads)) {
                 message.startThread({
                    name: `${message.author.username} - Thread`,
                    autoArchiveDuration: 1440 // 24h
                }).catch(() => {});
            }
        }
        // --- END AUTO THREAD ---

        // --- AUTO SLOWMODE ---
        if (config.automations?.autoslowmode?.enabled) {
            const { limit, time, duration } = config.automations.autoslowmode;
            if (limit && time && duration) {
                const now = Date.now();
                let msgs = slowmodeMap.get(message.channel.id) || [];
                // Filter out old timestamps
                msgs = msgs.filter(t => now - t < time);
                msgs.push(now);
                slowmodeMap.set(message.channel.id, msgs);

                if (msgs.length > limit) {
                    // Trigger Slowmode
                    if (message.channel.rateLimitPerUser < duration) {
                        if (message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
                            await message.channel.setRateLimitPerUser(duration, 'AutoSlowmode: Anti-Flood triggered').catch(() => {});
                            slowmodeMap.set(message.channel.id, []); 
                        }
                    }
                }
            }
        }
        // --- END AUTO SLOWMODE ---

        // --- Automod Check ---
        const { checkAutomod } = require('../utils/moderation/automod');
        if (await checkAutomod(client, message, config)) return;
        // --- End Automod Check ---

        let prefix = config.prefix || client.config.prefix;

        // Auto Publish
        if (config.autoPublish && message.channel.type === ChannelType.GuildAnnouncement) {
            const allowedChannels = config.autoPublishChannels || [];
            if (allowedChannels.length === 0 || allowedChannels.includes(message.channel.id)) {
                message.crosspost().catch(() => {});
            }
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
        
        // Check Subscription Helper
        const { checkSubscription } = require('../utils/subscription');
        const { isBotOwner } = require('../utils/ownerUtils');
        const isOwner = await isBotOwner(message.author.id);
        const freeCommands = ['activate', 'subscription', 'help', 'genkey'];

        // 1. Standard Command
        if (command) {
            if (!isOwner && !freeCommands.includes(command.name) && !checkSubscription(message.guild.id)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.license_required', message.guild.id), '', 'error')] });
            }

            // --- PERMISSION LEVEL SYSTEM (1-5) ---
            const userLevel = getUserLevel(message.member, config, isOwner);
            // --- END PERMISSION SYSTEM (Calculation) ---

            // Determine Required Level
            const requiredLevel = getCommandLevel(command);

            if (userLevel < requiredLevel) {
                if (requiredLevel === 10) {
                     return message.channel.send({ embeds: [createEmbed(await t('common.owner_only', message.guild.id), '', 'error')] });
                }
                return message.channel.send({ embeds: [createEmbed(await t('common.permission_denied_level', message.guild.id, { required: requiredLevel, user: userLevel }), '', 'error')] });
            }
            // --- END PERMISSION SYSTEM ---

            // --- AUTODELETE CHECK (COMMAND) ---
            const adConfig = config.autodelete || {};
            let shouldDeleteCommand = false;

            if (command.name === 'snipe' && adConfig.snipe?.command) {
                shouldDeleteCommand = true;
            } else if (command.category === 'Moderation' && adConfig.moderation?.command) {
                shouldDeleteCommand = true;
            }

            if (shouldDeleteCommand) {
                message.delete().catch(() => {});
            }
            // ----------------------------------

            try {
                // Check whitelist if necessary (for sensitive commands)
                // Custom Permission Check (SQLite)
                const permSettings = db.prepare('SELECT permission FROM command_permissions WHERE guild_id = ? AND command_name = ?').get(message.guild.id, command.name);
                
                if (permSettings) {
                    const reqPerm = permSettings.permission;
                    
                    // Disabled
                    if (reqPerm === '-1') {
                        if (message.author.id !== message.guild.ownerId && !isOwner) {
                            return; 
                        }
                    }
                    // Everyone
                    else if (reqPerm === '0') {
                        // Pass
                    }
                    // Role ID
                    else {
                        if (!message.member.roles.cache.has(reqPerm) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isOwner) {
                             return message.channel.send({ embeds: [createEmbed(await t('common.custom_permission_denied', message.guild.id), '', 'error')] });
                        }
                    }
                }

                if (command.run) {
                    await command.run(client, message, args);
                } else if (command.execute) {
                    await command.execute(client, message, args);
                }
            } catch (error) {
                logger.error(`Error executing command ${command.name}:`, error);
                message.channel.send({ embeds: [createEmbed(await t('common.execution_error', message.guild.id), '', 'error')] });
            }
        } 
        // 2. Custom Command
        else {
            const customCmd = await CustomCommand.findOne({ guildId: message.guild.id, trigger: commandName });
            if (customCmd) {
                if (!isOwner && !checkSubscription(message.guild.id)) {
                    return message.channel.send({ embeds: [createEmbed(await t('common.custom_command_license', message.guild.id), '', 'error')] });
                }
                // await message.channel.send(customCmd.response);
                await message.channel.send({ embeds: [createEmbed(customCmd.response, '', 'info')] });
            }
        }
    },
};
