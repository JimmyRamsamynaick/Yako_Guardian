const { redeemKey } = require('../../utils/subscription');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'activate',
    run: async (client, message, args) => {
        // Only owner or whitelist? Usually owner.
        if (message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('activate.owner_only', message.guild.id), []);
        }
        
        const key = args[0];
        if (!key) return sendV2Message(client, message.channel.id, await t('activate.usage', message.guild.id), []);
        
        const result = redeemKey(message.guild.id, key);
        
        if (result.success) {
            const date = new Date(result.expiresAt).toLocaleDateString('fr-FR');
            sendV2Message(client, message.channel.id, await t('activate.success', message.guild.id, { date }), []);
        } else {
            sendV2Message(client, message.channel.id, await t('activate.error', message.guild.id, { message: result.message }), []);
        }
    }
};
