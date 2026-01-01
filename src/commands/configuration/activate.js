const { redeemKey } = require('../../utils/subscription');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'activate',
    run: async (client, message, args) => {
        // Only owner or whitelist? Usually owner.
        if (message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Seul le propriétaire du serveur peut activer une licence.", []);
        }
        
        const key = args[0];
        if (!key) return sendV2Message(client, message.channel.id, "Usage: `+activate <clé>`", []);
        
        const result = redeemKey(message.guild.id, key);
        
        if (result.success) {
            const date = new Date(result.expiresAt).toLocaleDateString('fr-FR');
            sendV2Message(client, message.channel.id, `✅ **Licence activée avec succès !**\nVotre abonnement est valide jusqu'au : **${date}**`, []);
        } else {
            sendV2Message(client, message.channel.id, `❌ **Erreur :** ${result.message}`, []);
        }
    }
};
