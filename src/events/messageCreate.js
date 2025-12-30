// src/events/messageCreate.js
const { ChannelType } = require('discord.js');
const logger = require('../utils/logger');
const { db } = require('../database');

module.exports = {
    name: 'messageCreate',
    execute(client, message) {
        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;

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
