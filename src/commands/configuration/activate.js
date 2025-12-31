const { redeemKey } = require('../../utils/subscription');

module.exports = {
    name: 'activate',
    run: async (client, message, args) => {
        // Only owner or whitelist? Usually owner.
        if (message.author.id !== message.guild.ownerId) return message.reply("Seul le propriétaire du serveur peut activer une licence.");
        
        const key = args[0];
        if (!key) return message.reply("Usage: `+activate <clé>`");
        
        const result = redeemKey(message.guild.id, key);
        
        if (result.success) {
            const date = new Date(result.expiresAt).toLocaleDateString('fr-FR');
            message.reply(`✅ **Licence activée avec succès !**\nVotre abonnement est valide jusqu'au : **${date}**`);
        } else {
            message.reply(`❌ **Erreur :** ${result.message}`);
        }
    }
};
