const { createEmbed } = require('../../utils/design');
const axios = require('axios');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'search',
    description: 'Recherche avancée (Wiki)',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        if (sub === 'wiki') {
            const query = args.slice(1).join(' ');
            if (!query) return message.channel.send({ embeds: [createEmbed(await t('search.usage_keyword', message.guild.id), '', 'info')] });

            try {
                const url = `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'YakoGuardian/1.0 (jimmyramsamynaick@gmail.com)' }
                });
                const [searchTerm, titles, descriptions, urls] = res.data;

                if (!titles || titles.length === 0) {
                     return message.channel.send({ embeds: [createEmbed(await t('search.no_results', message.guild.id), '', 'error')] });
                }

                const list = titles.map((title, i) => `**${title}** - [Lien](${urls[i]})`).join('\n');
                await message.channel.send({ embeds: [createEmbed(await t('search.result_title', message.guild.id, { query: query }), list, 'info')] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(await t('search.error', message.guild.id), '', 'error')] });
            }
        } else {
            return message.channel.send({ embeds: [createEmbed(await t('search.usage', message.guild.id), '', 'info')] });
        }
    }
};