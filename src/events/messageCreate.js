// src/events/messageCreate.js
const { ChannelType } = require('discord.js');
const logger = require('../utils/logger');
const { db } = require('../database');
const AutoReact = require('../database/models/AutoReact');

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
        let prefix = client.config.prefix;
        // In a real scenario, we would fetch the custom prefix from DB here
        // const settings = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        // if (settings && settings.prefix) prefix = settings.prefix;

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

        if (!command) return;

        // Check Subscription
        const { checkSubscription } = require('../utils/subscription');
        const freeCommands = ['activate', 'subscription', 'help', 'genkey'];
        
        // If it's the owner (bot owner), bypass check (optional, but good for debug)
        const isBotOwner = message.author.id === process.env.OWNER_ID;

        if (!isBotOwner && !freeCommands.includes(command.name) && !checkSubscription(message.guild.id)) {
             return message.reply("🔒 **Ce serveur n'a pas de licence active.**\nLa protection et la configuration sont désactivées.\nUtilisez `+activate <clé>` pour activer Yako Guardian Premium.\n*(Coût: 5€/mois/serveur)*");
        }

        try {
            // Check whitelist if necessary (for sensitive commands)
            // This logic can be inside the command itself or a middleware
            
            command.run(client, message, args);
        } catch (error) {
            logger.error(`Error executing command ${commandName}:`, error);
            message.reply('Une erreur est survenue lors de l\'exécution de cette commande.');
        }
    },
};
