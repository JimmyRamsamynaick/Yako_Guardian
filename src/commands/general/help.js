const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    name: 'help',
    aliases: ['aide', 'h'],
    run: async (client, message, args) => {
        const rowSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_select_category')
                    .setPlaceholder('Choisir une catégorie')
                    .addOptions([
                        { 
                            label: 'Sécurité & Antiraid', 
                            value: 'help_antiraid', 
                            description: 'Commandes de protection et panneau de sécurité', 
                            emoji: '🛡️' 
                        },
                        { 
                            label: 'Configuration', 
                            value: 'help_config', 
                            description: 'Logs, sanctions, limites, antitoken...', 
                            emoji: '⚙️' 
                        },
                        { 
                            label: 'Whitelist & Gestion', 
                            value: 'help_whitelist', 
                            description: 'Gestion des permissions et blacklist', 
                            emoji: '👥' 
                        }
                    ])
            );

        const rowButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_close')
                    .setLabel('Fermer')
                    .setStyle(ButtonStyle.Danger)
            );

        await message.channel.send({
            content: `**YAKO GUARDIAN - AIDE**
            
Bienvenue sur le système d'aide interactif.
Veuillez sélectionner une catégorie dans le menu ci-dessous pour voir les commandes disponibles.

_Prefixe actuel :_ \`${client.config.prefix}\``,
            components: [rowSelect, rowButtons]
        });
    }
};
