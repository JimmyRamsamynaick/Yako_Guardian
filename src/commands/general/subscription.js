const { getSubscription } = require('../../utils/subscription');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'subscription',
    aliases: ['sub', 'abo'],
    category: 'General',
    run: async (client, message, args) => {
        const sub = getSubscription(message.guild.id);
        
        if (!sub || sub.expires_at < Date.now()) {
            return message.channel.send({ embeds: [createEmbed(await t('subscription.none', message.guild.id), '', 'error')] });
        }
        
        const date = new Date(sub.expires_at).toLocaleDateString('fr-FR');
        const daysLeft = Math.ceil((sub.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
        
        message.channel.send({ embeds: [createEmbed(await t('subscription.active', message.guild.id, { date, days: daysLeft }), '', 'success')] });
    }
};
