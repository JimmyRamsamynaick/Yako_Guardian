const { sendV2Message } = require('../../utils/componentUtils');
const axios = require('axios');

module.exports = {
    name: 'search',
    description: 'Recherche avancée (Wiki)',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        if (sub === 'wiki') {
            const query = args.slice(1).join(' ');
            if (!query) return sendV2Message(client, message.channel.id, "❌ Veuillez spécifier un mot-clé.", []);

            try {
                const url = `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
                const res = await axios.get(url);
                const [searchTerm, titles, descriptions, urls] = res.data;

                if (!titles || titles.length === 0) {
                     return sendV2Message(client, message.channel.id, "❌ Aucun résultat trouvé.", []);
                }

                const list = titles.map((title, i) => `**${title}** - [Lien](${urls[i]})`).join('\n');
                await sendV2Message(client, message.channel.id, `**Résultats Wiki pour "${query}":**\n${list}`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, "❌ Erreur lors de la recherche.", []);
            }
        } else {
            return sendV2Message(client, message.channel.id, "**Usage:** `+search wiki <mot-clé>`", []);
        }
    }
};