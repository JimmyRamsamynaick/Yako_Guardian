const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'yako',
    description: 'Envoie l’invitation du serveur de support',
    category: 'Utils',
    async run(client, message, args) {
        await sendV2Message(client, message.channel.id, await t('yako.message', message.guild.id), []);
    }
};