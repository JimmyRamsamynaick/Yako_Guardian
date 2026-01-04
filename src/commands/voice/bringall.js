const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'bringall',
    description: 'Déplacer tous les membres vocaux du serveur vers un salon',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('bringall.permission', message.guild.id), '', 'error')] });
        }

        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;

        if (!targetChannel) {
            return message.channel.send({ embeds: [createEmbed(await t('bringall.usage', message.guild.id), '', 'error')] });
        }

        if (!targetChannel.isVoiceBased()) {
            return message.channel.send({ embeds: [createEmbed(await t('bringall.invalid_channel', message.guild.id), '', 'error')] });
        }

        let count = 0;
        const membersToMove = message.guild.members.cache.filter(m => m.voice.channel && m.id !== message.member.id);

        for (const member of membersToMove.values()) {
            try {
                await member.voice.setChannel(targetChannel);
                count++;
            } catch (err) {}
        }

        return message.channel.send({ embeds: [createEmbed(await t('bringall.success', message.guild.id, { count, channel: targetChannel.toString() }), '', 'success')] });
    }
};