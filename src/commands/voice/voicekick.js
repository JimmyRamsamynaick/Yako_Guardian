const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'voicekick',
    description: 'Déconnecter un membre d\'un salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('voicekick.permission', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!member) {
            return message.channel.send({ embeds: [createEmbed(await t('voicekick.usage', message.guild.id), '', 'error')] });
        }

        if (!member.voice.channel) {
            return message.channel.send({ embeds: [createEmbed(await t('voicekick.not_in_voice', message.guild.id), '', 'error')] });
        }

        try {
            await member.voice.disconnect();
            return message.channel.send({ embeds: [createEmbed(await t('voicekick.success', message.guild.id, { tag: member.user.tag }), '', 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(await t('voicekick.error', message.guild.id), '', 'error')] });
        }
    }
};