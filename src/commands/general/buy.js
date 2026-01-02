const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'buy',
    description: 'Obtenir le lien pour acheter une licence Premium',
    category: 'General',
    run: async (client, message, args) => {
        // Récupérer l'URL depuis le .env ou mettre localhost par défaut
        // Note: localhost ne fonctionnera que pour vous. Il faudra mettre votre IP publique ou nom de domaine plus tard.
        const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3002';
        
        const title = await t('buy.title', message.guild.id);
        const desc = await t('buy.description', message.guild.id);
        const price = await t('buy.price', message.guild.id);
        const includes = await t('buy.includes', message.guild.id);
        const footer = await t('buy.footer', message.guild.id);

        const content = `${title}\n\n${desc}\n\n${price}\n\n${includes}\n\n${footer}`;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(await t('buy.button', message.guild.id))
                    .setStyle(ButtonStyle.Link)
                    .setURL(websiteUrl)
            );

        message.channel.send({ embeds: [createEmbed('Premium', content, 'info')], components: [row] });
    }
};
