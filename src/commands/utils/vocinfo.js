const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'vocinfo',
    description: 'Informations sur l’activité vocale',
    category: 'Utils',
    async run(client, message, args) {
        const voiceChannels = message.guild.channels.cache.filter(c => c.isVoiceBased());
        let totalMembers = 0;
        let activeChannels = 0;
        
        voiceChannels.forEach(c => {
            if (c.members.size > 0) {
                totalMembers += c.members.size;
                activeChannels++;
            }
        });

        const info = [
            `**Salons vocaux:** ${voiceChannels.size}`,
            `**Salons actifs:** ${activeChannels}`,
            `**Membres en vocal:** ${totalMembers}`,
            `**Membres muets (serv):** ${voiceChannels.reduce((acc, c) => acc + c.members.filter(m => m.voice.serverMute).size, 0)}`,
            `**Membres sourds (serv):** ${voiceChannels.reduce((acc, c) => acc + c.members.filter(m => m.voice.serverDeaf).size, 0)}`
        ].join('\n');

        await sendV2Message(client, message.channel.id, "**Activité Vocale**\n\n" + info, []);
    }
};