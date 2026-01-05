const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'listen',
    description: 'Change l\'activité du bot (Écoute...)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) {
             return message.channel.send({ embeds: [createEmbed(await t('common.owner_only', message.guild.id), '', 'error')] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(
            await t('listen.usage', message.guild.id),
            '',
            'info'
        )] });

        await setBotActivity(client, message, 'listen', text);
    }
};
