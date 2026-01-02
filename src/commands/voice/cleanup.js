const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'cleanup',
    description: 'Déconnecter tous les membres d\'un salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('cleanup.permission', message.guild.id), '', 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (!channel) {
            return message.channel.send({ embeds: [createEmbed(await t('cleanup.usage', message.guild.id), '', 'error')] });
        }

        if (!channel.isVoiceBased()) {
            return message.channel.send({ embeds: [createEmbed(await t('cleanup.not_voice', message.guild.id), '', 'error')] });
        }

        let count = 0;
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.disconnect();
                count++;
            } catch (e) {}
        }

        return message.channel.send({ embeds: [createEmbed(await t('cleanup.success', message.guild.id, { count, channel: channel.toString() }), '', 'success')] });
    }
};