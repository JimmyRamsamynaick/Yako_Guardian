const { createEmbed } = require('../../utils/design');
const axios = require('axios');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'wiki',
    description: 'Recherche Wikipédia',
    category: 'Utils',
    async run(client, message, args) {
        const query = args.join(' ');
        if (!query) return message.channel.send({ embeds: [createEmbed(await t('wiki.usage', message.guild.id), '', 'info')] });

        try {
            const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'YakoGuardian/1.0 (jimmyramsamynaick@gmail.com)' }
            });
            const data = res.data;

            if (data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                 return message.channel.send({ embeds: [createEmbed(await t('wiki.not_found', message.guild.id), '', 'error')] });
            }

            const info = `**${data.title}**\n${data.extract}\n\n` + await t('wiki.read_more', message.guild.id, { url: data.content_urls.desktop.page });
            await message.channel.send({ embeds: [createEmbed(info, '', 'info')] });
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 404) {
                return message.channel.send({ embeds: [createEmbed(await t('wiki.not_found', message.guild.id), '', 'error')] });
            }
            return message.channel.send({ embeds: [createEmbed(await t('wiki.error', message.guild.id), '', 'error')] });
        }
    }
};