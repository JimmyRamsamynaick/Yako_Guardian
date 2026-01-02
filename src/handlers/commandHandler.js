// src/handlers/commandHandler.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    
    // Recursive function to find commands
    const getFiles = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let commandFiles = [];
        
        for (const file of files) {
            if (file.isDirectory()) {
                commandFiles = [...commandFiles, ...getFiles(path.join(dir, file.name))];
            } else if (file.name.endsWith('.js')) {
                commandFiles.push(path.join(dir, file.name));
            }
        }
        return commandFiles;
    };

    if (!fs.existsSync(commandsPath)) return;

    const commandFiles = getFiles(commandsPath);

    for (const filePath of commandFiles) {
        try {
            const command = require(filePath);
            
            // Assign category based on folder name
            const category = path.dirname(filePath).split(path.sep).pop();
            command.category = category;

            if (command.name) {
                client.commands.set(command.name, command);
                logger.info(`Command loaded: ${command.name}`);
                
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                }
            }
        } catch (error) {
            logger.error(`Error loading command ${filePath}:`, error);
        }
    }
};
