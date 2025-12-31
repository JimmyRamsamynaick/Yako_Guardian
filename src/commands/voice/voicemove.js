const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'voicemove',
    description: 'Déplacer un utilisateur vers un autre salon vocal',
    category: 'Vocal',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Déplacer des membres` requise.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!member || !channel) {
             return sendV2Message(client, message.channel.id, "**Utilisation:** `+voicemove <@user> <ID salon destination>`", []);
        }

        if (!member.voice.channel) {
            return sendV2Message(client, message.channel.id, "❌ L'utilisateur n'est pas en vocal.", []);
        }

        if (!channel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, "❌ Le salon de destination doit être un salon vocal.", []);
        }

        try {
            await member.voice.setChannel(channel);
            sendV2Message(client, message.channel.id, `✅ **${member.user.tag}** déplacé vers ${channel.name}.`, []);
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, "❌ Impossible de déplacer ce membre (Permissions ?).", []);
        }
    }
};