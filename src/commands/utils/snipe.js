const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'snipe',
    description: 'Affiche le dernier message supprimé du salon',
    category: 'Utils',
    async run(client, message, args) {
        const snipe = client.snipes.get(message.channel.id);
        if (!snipe) return sendV2Message(client, message.channel.id, "❌ Aucun message supprimé récemment.", []);

        let content = `**De:** ${snipe.author} (<t:${Math.floor(snipe.date.getTime() / 1000)}:R>)\n**Contenu:** ${snipe.content}`;
        if (snipe.image) content += `\n**Image:** ${snipe.image}`;

        await sendV2Message(client, message.channel.id, content, []);
    }
};