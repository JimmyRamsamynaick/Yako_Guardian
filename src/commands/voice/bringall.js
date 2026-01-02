const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'bringall',
    description: 'Déplacer tous les membres vocaux du serveur vers un salon',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('bringall.permission', message.guild.id), []);
        }

        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;

        if (!targetChannel) {
            return sendV2Message(client, message.channel.id, await t('bringall.usage', message.guild.id), []);
        }

        if (!targetChannel.isVoiceBased()) {
            return sendV2Message(client, message.channel.id, await t('bringall.invalid_channel', message.guild.id), []);
        }

        let count = 0;
        message.guild.members.cache.filter(m => m.voice.channel && m.id !== message.member.id).forEach(async (member) => {
            try {
                await member.voice.setChannel(targetChannel);
                count++;
            } catch (err) {}
        });

        return sendV2Message(client, message.channel.id, await t('bringall.success', message.guild.id, { count, channel: targetChannel.toString() }), []);
    }
};