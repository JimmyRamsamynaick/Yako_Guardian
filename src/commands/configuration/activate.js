const { redeemKey } = require('../../utils/subscription');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'activate',
    category: 'Configuration',
    run: async (client, message, args) => {
        // Only owner or whitelist? Usually owner.
        if (message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('activate.owner_only', message.guild.id), '', 'error')] });
        }
        
        const key = args[0];
        if (!key) return message.channel.send({ embeds: [createEmbed(await t('activate.usage', message.guild.id), '', 'info')] });
        
        const result = redeemKey(message.guild.id, key);
        
        if (result.success) {
            const date = new Date(result.expiresAt).toLocaleDateString('fr-FR');
            message.channel.send({ embeds: [createEmbed(await t('activate.success', message.guild.id, { date }), '', 'success')] });
        } else {
            message.channel.send({ embeds: [createEmbed(await t('activate.error', message.guild.id, { message: result.message }), '', 'error')] });
        }
    }
};
