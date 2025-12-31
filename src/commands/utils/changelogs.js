const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'changelogs',
    description: 'Affiche les dernières notes de mise à jour',
    category: 'Utils',
    async run(client, message, args) {
        const changes = [
            "• Ajout des commandes utilitaires (serverinfo, userinfo, etc.)",
            "• Système de logs complet à 100%",
            "• Correction du système de boutons",
            "• Optimisation du code et passage en V2 components"
        ];
        await sendV2Message(client, message.channel.id, "**Changelogs - Version Actuelle**\n\n" + changes.join('\n'), []);
    }
};