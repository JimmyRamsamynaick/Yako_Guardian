const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

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
            await t('vocinfo.channels', message.guild.id, { count: voiceChannels.size }),
            await t('vocinfo.active', message.guild.id, { count: activeChannels }),
            await t('vocinfo.members', message.guild.id, { count: totalMembers }),
            await t('vocinfo.muted', message.guild.id, { count: voiceChannels.reduce((acc, c) => acc + c.members.filter(m => m.voice.serverMute).size, 0) }),
            await t('vocinfo.deafened', message.guild.id, { count: voiceChannels.reduce((acc, c) => acc + c.members.filter(m => m.voice.serverDeaf).size, 0) })
        ].join('\n');

        await sendV2Message(client, message.channel.id, (await t('vocinfo.title', message.guild.id)) + "\n\n" + info, []);
    }
};