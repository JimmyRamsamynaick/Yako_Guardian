const { createEmbed } = require('../../utils/design');
const { setBotStatus } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'online',
    description: 'Change le statut du bot (En ligne)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) {
             return message.channel.send({ embeds: [createEmbed(await t('common.owner_only', message.guild.id), '', 'error')] });
        }
        await setBotStatus(client, message, 'online');
    }
};
