const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'image',
    description: 'Recherche Google Images (Lien)',
    category: 'Utils',
    async run(client, message, args) {
        const query = args.join(' ');
        if (!query) return message.channel.send({ embeds: [createEmbed(await t('image.usage', message.guild.id), '', 'info')] });
        
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        await message.channel.send({ embeds: [createEmbed(await t('image.success', message.guild.id, { query: query, url: url }), '', 'success')] });
    }
};