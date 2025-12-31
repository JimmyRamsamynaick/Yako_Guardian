const { getSubscription } = require('../../utils/subscription');

module.exports = {
    name: 'subscription',
    aliases: ['sub', 'abo'],
    run: async (client, message, args) => {
        const sub = getSubscription(message.guild.id);
        
        if (!sub || sub.expires_at < Date.now()) {
            return message.reply("❌ **Aucun abonnement actif.**\nCe serveur n'est pas protégé par Yako Guardian Premium.\nVeuillez acheter une clé de licence pour activer la protection.");
        }
        
        const date = new Date(sub.expires_at).toLocaleDateString('fr-FR');
        const daysLeft = Math.ceil((sub.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
        
        message.reply(`✅ **Abonnement Actif**\nExpire le : **${date}**\nJours restants : **${daysLeft}**`);
    }
};
