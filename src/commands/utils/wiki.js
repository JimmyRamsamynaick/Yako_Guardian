const { sendV2Message } = require('../../utils/componentUtils');
const axios = require('axios');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'wiki',
    description: 'Recherche Wikipédia',
    category: 'Utils',
    async run(client, message, args) {
        const query = args.join(' ');
        if (!query) return sendV2Message(client, message.channel.id, await t('wiki.usage', message.guild.id), []);

        try {
            const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'YakoGuardian/1.0 (jimmyramsamynaick@gmail.com)' }
            });
            const data = res.data;

            if (data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                 return sendV2Message(client, message.channel.id, await t('wiki.not_found', message.guild.id), []);
            }

            const info = `**${data.title}**\n${data.extract}\n\n` + await t('wiki.read_more', message.guild.id, { url: data.content_urls.desktop.page });
            await sendV2Message(client, message.channel.id, info, []);
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 404) {
                return sendV2Message(client, message.channel.id, await t('wiki.not_found', message.guild.id), []);
            }
            return sendV2Message(client, message.channel.id, await t('wiki.error', message.guild.id), []);
        }
    }
};