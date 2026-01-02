const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'voicemove',
    description: 'Déplacer un utilisateur vers un autre salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('voicemove.permission', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!member || !channel) {
             return sendV2Message(client, message.channel.id, await t('voicemove.usage', message.guild.id), []);
        }

        if (!member.voice.channel) {
            return sendV2Message(client, message.channel.id, await t('voicemove.user_not_in_voice', message.guild.id), []);
        }

        if (!channel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, await t('voicemove.dest_not_voice', message.guild.id), []);
        }

        try {
            await member.voice.setChannel(channel);
            return sendV2Message(client, message.channel.id, await t('voicemove.success', message.guild.id, { tag: member.user.tag, channel: channel.toString() }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('voicemove.error', message.guild.id), []);
        }
    }
};