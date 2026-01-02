const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'voicekick',
    description: 'Déconnecter un membre d\'un salon vocal',
    category: 'Voice',
    async run(client, message, args) {
        if (!message.member.permissions.has('MoveMembers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('voicekick.permission', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!member) {
            return sendV2Message(client, message.channel.id, await t('voicekick.usage', message.guild.id), []);
        }

        if (!member.voice.channel) {
            return sendV2Message(client, message.channel.id, await t('voicekick.not_in_voice', message.guild.id), []);
        }

        try {
            await member.voice.disconnect();
            return sendV2Message(client, message.channel.id, await t('voicekick.success', message.guild.id, { tag: member.user.tag }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('voicekick.error', message.guild.id), []);
        }
    }
};