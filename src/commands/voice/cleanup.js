const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'cleanup',
    description: 'Déconnecter tous les membres d\'un salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('cleanup.permission', message.guild.id), []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (!channel) {
            return sendV2Message(client, message.channel.id, await t('cleanup.usage', message.guild.id), []);
        }

        if (!channel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, await t('cleanup.not_voice', message.guild.id), []);
        }

        let count = 0;
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.disconnect();
                count++;
            } catch (e) {}
        }

        return sendV2Message(client, message.channel.id, await t('cleanup.success', message.guild.id, { count, channel: channel.toString() }), []);
    }
};