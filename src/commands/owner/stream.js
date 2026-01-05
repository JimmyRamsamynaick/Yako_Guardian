const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'stream',
    description: 'Change l\'activité du bot (Streame...)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) {
             return message.channel.send({ embeds: [createEmbed(await t('common.owner_only', message.guild.id), '', 'error')] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(
            await t('stream.usage', message.guild.id),
            '',
            'info'
        )] });

        const defaultUrl = 'https://www.twitch.tv/discord';
        
        await setBotActivity(client, message, 'stream', text, defaultUrl);
    }
};
