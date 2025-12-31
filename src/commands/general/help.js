const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

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
                            label: 'Utilitaires & Rôles', 
                            value: 'help_utils', 
                            description: 'Embeds, rôles, vocal, autoreact...', 
                            emoji: '🔧' 
                        },
                        { 
                            label: 'Administration & Backups', 
                            value: 'help_admin', 
                            description: 'Whitelist, sauvegardes, sync, modmail...', 
                            emoji: '💾' 
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

        const content = `**YAKO GUARDIAN - AIDE**
            
Bienvenue sur le système d'aide interactif.
Veuillez sélectionner une catégorie dans le menu ci-dessous pour voir les commandes disponibles.

_Prefixe actuel :_ \`${client.config.prefix}\``;

        try {
            await sendV2Message(client, message.channel.id, content, [rowSelect, rowButtons]);
        } catch (error) {
            console.error("Error sending V2 help:", error);
            message.reply("Erreur lors de l'affichage du menu d'aide V2.");
        }
    }
};
