const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'cleanup',
    description: 'Déconnecter tous les membres d\'un salon vocal',
    category: 'Vocal',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Déplacer des membres` requise.", []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (!channel) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+cleanup <ID salon>`", []);
        }

        if (!channel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, "❌ Ce n'est pas un salon vocal.", []);
        }

        let count = 0;
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.disconnect();
                count++;
            } catch (e) {
                console.error(e);
            }
        }

        sendV2Message(client, message.channel.id, `✅ **${count}** membres déconnectés de ${channel.name}.`, []);
    }
};