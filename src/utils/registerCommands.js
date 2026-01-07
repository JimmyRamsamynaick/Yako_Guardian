const { ApplicationCommandType } = require('discord.js');
const logger = require('./logger');

async function registerGlobalCommands(client) {
    const commands = [
        {
            name: 'Report Message',
            type: ApplicationCommandType.Message
        }
    ];

    try {
        logger.info('Started refreshing application context menus.');
        
        // Register globally
        await client.application.commands.set(commands);
        
        logger.info('Successfully reloaded application context menus.');
    } catch (error) {
        logger.error('Error refreshing application commands:', error);
    }
}

module.exports = { registerGlobalCommands };
