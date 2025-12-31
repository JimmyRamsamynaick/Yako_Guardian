const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'invite',
    description: 'Génère une invitation pour un serveur (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const id = args[0];
        if (!id) return sendV2Message(client, message.channel.id, "❌ Précisez l'ID du serveur.", []);

        const guild = client.guilds.cache.get(id);
        if (!guild) return sendV2Message(client, message.channel.id, "❌ Serveur introuvable.", []);

        // Try to find a channel to create invite
        const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        if (!channel) return sendV2Message(client, message.channel.id, "❌ Impossible de créer une invitation (pas de permissions ou pas de salon).", []);

        const invite = await channel.createInvite({ maxAge: 0, maxUses: 1 });
        return sendV2Message(client, message.channel.id, `✅ **Invitation pour ${guild.name}:**\n${invite.url}`, []);
    }
};
