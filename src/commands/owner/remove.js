const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'remove',
    description: 'Supprime des éléments (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const sub = args[0]?.toLowerCase();

        if (sub === 'activity') {
            client.user.setActivity(null);
            await GlobalSettings.findOneAndUpdate({ clientId: client.user.id }, { activity: { type: null, name: null } }, { upsert: true });
            return message.channel.send({ embeds: [createEmbed(
                await t('remove.success', message.guild.id),
                '',
                'success'
            )] });
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('remove.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
