const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'leave',
    description: 'Quitte un serveur (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const id = args[0];
        if (!id) return sendV2Message(client, message.channel.id, "❌ Précisez l'ID du serveur.", []);

        const guild = client.guilds.cache.get(id);
        if (!guild) return sendV2Message(client, message.channel.id, "❌ Serveur introuvable.", []);

        await guild.leave();
        return sendV2Message(client, message.channel.id, `✅ J'ai quitté **${guild.name}**.`, []);
    }
};
