const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'voicemove',
    description: 'Déplacer tous les membres d\'un salon vocal vers un autre',
    category: 'Vocal',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Déplacer des membres` requise.", []);
        }

        const channel1 = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        const channel2 = message.mentions.channels.first(2)[1] || message.guild.channels.cache.get(args[1]);

        // If user is in a channel, they might omit the first arg
        // But to be safe and explicit, let's require both OR assume arg[0] is source if only one arg provided?
        // Standard syntax: +voicemove <from> <to>
        
        if (!channel1 || !channel2) {
             return sendV2Message(client, message.channel.id, "**Utilisation:** `+voicemove <ID salon source> <ID salon destination>`", []);
        }

        if (!channel1.isVoiceBased() || !channel2.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, "❌ Les salons doivent être des salons vocaux.", []);
        }

        let count = 0;
        for (const [memberId, member] of channel1.members) {
            try {
                await member.voice.setChannel(channel2);
                count++;
            } catch (e) {
                console.error(e);
            }
        }

        sendV2Message(client, message.channel.id, `✅ **${count}** membres déplacés de ${channel1.name} vers ${channel2.name}.`, []);
    }
};