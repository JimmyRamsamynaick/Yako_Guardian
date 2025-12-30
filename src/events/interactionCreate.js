// src/events/interactionCreate.js
const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    execute(client, interaction) {
        // We will implement component handling logic here later
        // It's often better to have a dedicated handler or route interactions based on customId
        
        if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            // For now, we emit a custom event or handle it directly
            // A simple way is to check if the command that created it has a handler, 
            // but often buttons are persistent.
            
            // We'll use a dynamic loader or a switch case in a separate file if it gets complex.
            // For this project, let's try to route by ID prefix.
            // e.g., 'secur_main_menu', 'antiraid_toggle_logs'
            
            const customId = interaction.customId;
            
            // We can emit an event internally so specific modules can listen
            client.emit('componentInteraction', interaction);
        }
    },
};
