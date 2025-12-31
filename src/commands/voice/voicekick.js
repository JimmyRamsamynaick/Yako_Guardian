const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'voicekick',
    description: 'Déconnecter un membre d\'un salon vocal',
    category: 'Vocal',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Déplacer des membres` requise.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!member) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+voicekick <@membre>`", []);
        }

        if (!member.voice.channel) {
            return sendV2Message(client, message.channel.id, "❌ Ce membre n'est pas en vocal.", []);
        }

        try {
            await member.voice.disconnect();
            sendV2Message(client, message.channel.id, `✅ **${member.user.tag}** a été déconnecté du vocal.`, []);
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, "❌ Impossible de déconnecter ce membre (Permissions insuffisantes ?).", []);
        }
    }
};