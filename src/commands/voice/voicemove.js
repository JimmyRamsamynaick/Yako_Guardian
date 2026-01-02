const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'voicemove',
    description: 'Déplacer un utilisateur vers un autre salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('voicemove.permission', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!member || !channel) {
             return message.channel.send({ embeds: [createEmbed(await t('voicemove.usage', message.guild.id), '', 'error')] });
        }

        if (!member.voice.channel) {
            return message.channel.send({ embeds: [createEmbed(await t('voicemove.user_not_in_voice', message.guild.id), '', 'error')] });
        }

        if (!channel.isVoiceBased()) {
            return message.channel.send({ embeds: [createEmbed(await t('voicemove.dest_not_voice', message.guild.id), '', 'error')] });
        }

        try {
            await member.voice.setChannel(channel);
            return message.channel.send({ embeds: [createEmbed(await t('voicemove.success', message.guild.id, { tag: member.user.tag, channel: channel.toString() }), '', 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(await t('voicemove.error', message.guild.id), '', 'error')] });
        }
    }
};