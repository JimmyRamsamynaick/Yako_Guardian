const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'yako',
    description: 'Envoie l’invitation du serveur de support',
    category: 'Utils',
    async run(client, message, args) {
        const supportLink = 'https://discord.gg/sferTT73tZ';

        const embed = createEmbed(
            await t('yako.title', message.guild.id),
            await t('yako.description', message.guild.id, { link: supportLink }),
            'info'
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(await t('yako.button', message.guild.id))
                .setStyle(ButtonStyle.Link)
                .setURL(supportLink)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
};