const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'image',
    description: 'Recherche Google Images (Lien)',
    category: 'Utils',
    async run(client, message, args) {
        const query = args.join(' ');
        if (!query) return sendV2Message(client, message.channel.id, await t('image.usage', message.guild.id), []);
        
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        await sendV2Message(client, message.channel.id, await t('image.success', message.guild.id, { query: query, url: url }), []);
    }
};