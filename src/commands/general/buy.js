const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'buy',
    description: 'Obtenir le lien pour acheter une licence Premium',
    category: 'General',
    run: async (client, message, args) => {
        // Récupérer l'URL depuis le .env ou mettre localhost par défaut
        // Note: localhost ne fonctionnera que pour vous. Il faudra mettre votre IP publique ou nom de domaine plus tard.
        const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3002';
        
        const content = `**💎 Yako Guardian Premium**\n\n` +
            `Débloquez la puissance totale de Yako Guardian pour protéger votre serveur efficacement.\n\n` +
            `**💸 Prix:** \`5.00€ / mois\`\n\n` +
            `**🚀 Inclus:**\n` +
            `• Anti-Raid Complet\n` +
            `• Anti-Token & Mass Mention\n` +
            `• Protection des Salons & Rôles\n` +
            `• Support Prioritaire\n\n` +
            `_Cliquez sur le bouton ci-dessous pour accéder à la boutique_`;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Accéder à la Boutique')
                    .setStyle(ButtonStyle.Link)
                    .setURL(websiteUrl)
            );

        sendV2Message(client, message.channel.id, content, [row]);
    }
};
