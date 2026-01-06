const { getSubscription, redeemKey } = require('../../utils/subscription');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'subscription',
    aliases: ['sub', 'abo'],
    category: 'General',
    run: async (client, message, args) => {
        const subCmd = args[0]?.toLowerCase();

        // ACTIVATE SUBCOMMAND
        if (subCmd === 'activate') {
            if (message.author.id !== message.guild.ownerId) {
                return message.channel.send({ embeds: [createEmbed(await t('activate.owner_only', message.guild.id), '', 'error')] });
            }
            
            const key = args[1];
            if (!key) return message.channel.send({ embeds: [createEmbed(await t('activate.usage', message.guild.id), '', 'info')] });
            
            const result = redeemKey(message.guild.id, key);
            
            if (result.success) {
                const date = new Date(result.expiresAt).toLocaleDateString('fr-FR');
                return message.channel.send({ embeds: [createEmbed(await t('activate.success', message.guild.id, { date }), '', 'success')] });
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('activate.error', message.guild.id, { message: result.message }), '', 'error')] });
            }
        }

        const sub = getSubscription(message.guild.id);
        
        if (!sub || sub.expires_at < Date.now()) {
            return message.channel.send({ embeds: [createEmbed(await t('subscription.none', message.guild.id), '', 'error')] });
        }
        
        const date = new Date(sub.expires_at).toLocaleDateString('fr-FR');
        const daysLeft = Math.ceil((sub.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
        
        message.channel.send({ embeds: [createEmbed(await t('subscription.active', message.guild.id, { date, days: daysLeft }), await t('subscription.help_activate', message.guild.id), 'success')] });
    }
};
