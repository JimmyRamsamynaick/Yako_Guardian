const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'buy',
    description: 'Obtenir le lien pour acheter une licence Premium',
    category: 'General',
    run: async (client, message, args) => {
        // Récupérer l'URL depuis le .env ou mettre localhost par défaut
        // Note: localhost ne fonctionnera que pour vous. Il faudra mettre votre IP publique ou nom de domaine plus tard.
        const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3002';
        
        const embed = new EmbedBuilder()
            .setTitle('💎 Yako Guardian Premium')
            .setDescription('Débloquez la puissance totale de Yako Guardian pour protéger votre serveur efficacement.')
            .addFields(
                { name: '💸 Prix', value: '`5.00€ / mois`', inline: true },
                { name: '🚀 Inclus', value: '• Anti-Raid Complet\n• Anti-Token & Mass Mention\n• Protection des Salons & Rôles\n• Support Prioritaire', inline: false }
            )
            .setColor('#FFD700') // Or
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour accéder à la boutique' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Accéder à la Boutique')
                    .setStyle(ButtonStyle.Link)
                    .setURL(websiteUrl)
            );

        message.reply({ embeds: [embed], components: [row] });
    }
};
