const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'changelogs',
    description: 'Affiche les dernières notes de mise à jour',
    category: 'Utils',
    async run(client, message, args) {
        const content = await t('changelogs.content', message.guild.id);
        const title = await t('changelogs.title', message.guild.id);
        await sendV2Message(client, message.channel.id, `${title}\n\n${content}`, []);
    }
};