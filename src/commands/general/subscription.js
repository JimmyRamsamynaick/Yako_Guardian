const { getSubscription } = require('../../utils/subscription');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'subscription',
    aliases: ['sub', 'abo'],
    run: async (client, message, args) => {
        const sub = getSubscription(message.guild.id);
        
        if (!sub || sub.expires_at < Date.now()) {
            return sendV2Message(client, message.channel.id, await t('subscription.none', message.guild.id), []);
        }
        
        const date = new Date(sub.expires_at).toLocaleDateString('fr-FR');
        const daysLeft = Math.ceil((sub.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
        
        sendV2Message(client, message.channel.id, await t('subscription.active', message.guild.id, { date, days: daysLeft }), []);
    }
};
