// src/events/messageCreate.js
const { ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { db } = require('../database');
const AutoReact = require('../database/models/AutoReact');
const { getGuildConfig } = require('../utils/mongoUtils');
const CustomCommand = require('../database/models/CustomCommand');
const { t } = require('../utils/i18n');

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
            const { sendV2Message } = require('../utils/componentUtils');
            if (!isOwner && !freeCommands.includes(command.name) && !checkSubscription(message.guild.id)) {
                return sendV2Message(client, message.channel.id, await t('common.license_required', message.guild.id), []);
            }

            // --- PERMISSION LEVEL SYSTEM (1-5) ---
            let userLevel = 0;
            if (isOwner) userLevel = 10; // Bot Owner
            else if (message.author.id === message.guild.ownerId) userLevel = 5;
            else if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) userLevel = 4; // Admins default to Level 4 (can be overridden by Perm 5 assignment?)
            // Actually, let's keep Admins at 0/4? 
            // Better: If they have Admin perm, they should have high access. Let's say Level 4.
            // But if they are assigned specific level, that might be higher/lower.
            // Let's rely on configured levels first, then fallback to Admin=4 if not set?
            // User request: "Level 5 c'est all".
            
            if (config.permissionLevels) {
                for (let i = 5; i >= 1; i--) {
                    const ids = config.permissionLevels[i.toString()] || [];
                    if (ids.includes(message.author.id) || (message.member && message.member.roles.cache.hasAny(...ids))) {
                        if (i > userLevel) userLevel = i;
                        break;
                    }
                }
            }
            // Fallback for Administrator if not explicitly restricted/assigned?
            // If user has Admin permission but is not in any Level, should they get Level 4?
            // Let's say yes, to prevent locking out admins.
            if (userLevel < 4 && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                userLevel = 4;
            }

            // Determine Required Level
            let requiredLevel = command.permLevel || 0;
            if (command.permLevel === undefined) {
                // Default Categories
                const cat = command.category ? command.category.toLowerCase() : 'general';
                if (cat === 'owner') requiredLevel = 10;
                else if (cat === 'antiraid' || cat === 'secur' || command.name === 'backup') requiredLevel = 4;
                else if (cat === 'configuration' || cat === 'administration') requiredLevel = 3;
                else if (cat === 'moderation' || cat === 'modmail') requiredLevel = 2;
                else if (cat === 'roles' || cat === 'tickets') requiredLevel = 1; // Basic setup
                else requiredLevel = 0;
            }

            if (userLevel < requiredLevel) {
                if (requiredLevel === 10) {
                     return sendV2Message(client, message.channel.id, await t('common.owner_only', message.guild.id), []);
                }
                return sendV2Message(client, message.channel.id, await t('common.permission_denied_level', message.guild.id, { required: requiredLevel, user: userLevel }), []);
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
                             return sendV2Message(client, message.channel.id, await t('common.custom_permission_denied', message.guild.id), []);
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
                sendV2Message(client, message.channel.id, await t('common.execution_error', message.guild.id), []);
            }
        } 
        // 2. Custom Command
        else {
            const customCmd = await CustomCommand.findOne({ guildId: message.guild.id, trigger: commandName });
            if (customCmd) {
                const { sendV2Message } = require('../utils/componentUtils');
                if (!isOwner && !checkSubscription(message.guild.id)) {
                    return sendV2Message(client, message.channel.id, await t('common.custom_command_license', message.guild.id), []);
                }
                // await message.channel.send(customCmd.response);
                await sendV2Message(client, message.channel.id, customCmd.response, []);
            }
        }
    },
};
