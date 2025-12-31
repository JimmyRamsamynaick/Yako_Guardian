const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'image',
    description: 'Recherche Google Images (Lien)',
    category: 'Utils',
    async run(client, message, args) {
        const query = args.join(' ');
        if (!query) return sendV2Message(client, message.channel.id, "❌ Veuillez spécifier un mot-clé.", []);
        
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        await sendV2Message(client, message.channel.id, `**Recherche Images:** [${query}](${url})`, []);
    }
};