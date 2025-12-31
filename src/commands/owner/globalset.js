const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'globalset',
    description: 'Modifie le profil GLOBAL du bot (Owner uniquement)',
    category: 'Owner',
    aliases: ['gset'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const type = args[0]?.toLowerCase();
        const value = args.slice(1).join(' ');

        if (!type || !value) {
            return sendV2Message(client, message.channel.id, 
                "**Usage Global:** `+globalset <name/pic/banner> <valeur>`\n⚠️ **Attention:** Ceci modifie le bot pour TOUS les serveurs.", 
            []);
        }

        try {
            if (type === 'name') {
                await client.user.setUsername(value);
                return sendV2Message(client, message.channel.id, `✅ Nom global du bot modifié en **${value}**.`, []);
            } else if (['pic', 'avatar', 'pfp'].includes(type)) {
                await client.user.setAvatar(value);
                return sendV2Message(client, message.channel.id, "✅ Avatar global mis à jour.", []);
            } else if (['banner'].includes(type)) {
                // Bots need to be verified/partnered? Not always, but usually tricky via API for normal bots?
                // Actually setBanner is not a method on client.user directly in v14?
                // It's typically done via the API or dashboard.
                // client.user.setBanner doesn't exist.
                return sendV2Message(client, message.channel.id, "❌ Le changement de bannière par commande n'est pas supporté par l'API (Dashboard uniquement).", []);
            } else {
                return sendV2Message(client, message.channel.id, "❌ Option invalide.", []);
            }
        } catch (e) {
            return sendV2Message(client, message.channel.id, `❌ Erreur : ${e.message}\n(Trop de changements rapides ?)`, []);
        }
    }
};
