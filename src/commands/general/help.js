const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { db } = require('../../database');

module.exports = {
    name: 'help',
    aliases: ['aide', 'h'],
    run: async (client, message, args) => {
        // Get help type configuration
        const settings = db.prepare('SELECT help_type, help_alias_enabled FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        const helpType = settings?.help_type || 'select'; // select, button, hybrid

        const components = [];

        // 1. SELECT MENU
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder('Choisir une catégorie')
            .addOptions([
                { label: 'Sécurité & Antiraid', value: 'help_antiraid', description: 'Commandes de protection', emoji: '🛡️' },
                { label: 'Configuration', value: 'help_config', description: 'Logs, sanctions, limites...', emoji: '⚙️' },
                { label: 'Utilitaires & Rôles', value: 'help_utils', description: 'Embeds, rôles, vocal...', emoji: '🔧' },
                { label: 'Administration', value: 'help_admin', description: 'Whitelist, sauvegardes, modmail...', emoji: '💾' },
                { label: 'Espace Owner', value: 'help_owner', description: 'Gestion bot, blacklist globale...', emoji: '👑' }
            ]);

        // 2. BUTTONS
        const btnAntiraid = new ButtonBuilder().setCustomId('help_btn_antiraid').setLabel('Sécurité').setStyle(ButtonStyle.Primary).setEmoji('🛡️');
        const btnConfig = new ButtonBuilder().setCustomId('help_btn_config').setLabel('Config').setStyle(ButtonStyle.Primary).setEmoji('⚙️');
        const btnUtils = new ButtonBuilder().setCustomId('help_btn_utils').setLabel('Utils').setStyle(ButtonStyle.Primary).setEmoji('🔧');
        const btnAdmin = new ButtonBuilder().setCustomId('help_btn_admin').setLabel('Admin').setStyle(ButtonStyle.Primary).setEmoji('💾');
        const btnOwner = new ButtonBuilder().setCustomId('help_btn_owner').setLabel('Owner').setStyle(ButtonStyle.Danger).setEmoji('👑');

        // Build Rows based on Type
        if (helpType === 'select') {
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        } 
        else if (helpType === 'button') {
            components.push(new ActionRowBuilder().addComponents(btnAntiraid, btnConfig, btnUtils, btnAdmin, btnOwner));
        } 
        else if (helpType === 'hybrid') {
            // Both Select AND Buttons (maybe buttons for quick access)
            // Or Select for detailed, Buttons for categories?
            // Let's do: Select Menu + Buttons row
            components.push(new ActionRowBuilder().addComponents(selectMenu));
            components.push(new ActionRowBuilder().addComponents(btnAntiraid, btnConfig, btnUtils, btnAdmin, btnOwner));
        }

        // Close Button (Always present)
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_close').setLabel('Fermer').setStyle(ButtonStyle.Danger)
        ));

        const content = `**YAKO GUARDIAN - AIDE**
            
Bienvenue sur le système d'aide interactif.
Mode d'affichage: **${helpType.toUpperCase()}**

_Prefixe actuel :_ \`${client.config.prefix}\``;

        try {
            await sendV2Message(client, message.channel.id, content, components);
        } catch (error) {
            console.error("Error sending V2 help:", error);
            message.reply("Erreur lors de l'affichage du menu d'aide V2.");
        }
    }
};
