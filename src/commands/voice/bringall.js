const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'bringall',
    description: 'Déplacer tous les membres vocaux du serveur vers un salon',
    category: 'Vocal',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Déplacer des membres` requise.", []);
        }

        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;

        if (!targetChannel) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+bringall [ID salon]` (ou soyez dans un salon vocal)", []);
        }

        if (!targetChannel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, "❌ Salon de destination invalide.", []);
        }

        let count = 0;
        const voiceChannels = message.guild.channels.cache.filter(c => c.isVoiceBased() && c.id !== targetChannel.id);

        for (const [id, channel] of voiceChannels) {
            for (const [memberId, member] of channel.members) {
                try {
                    await member.voice.setChannel(targetChannel);
                    count++;
                } catch (e) {
                    // Ignore errors (perms etc)
                }
            }
        }

        sendV2Message(client, message.channel.id, `✅ **${count}** membres déplacés vers ${targetChannel.name}.`, []);
    }
};