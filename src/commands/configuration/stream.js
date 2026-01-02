const { PermissionsBitField } = require('discord.js');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'stream',
    description: 'Change l\'activité du bot (Streame...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('stream.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(
            await t('stream.usage', message.guild.id),
            '',
            'info'
        )] });

        // Use a default URL if not extracted, or maybe args?
        // Crowbot just says +stream [message]. It likely uses a default twitch url.
        const defaultUrl = 'https://www.twitch.tv/discord';
        
        await setBotActivity(client, message, 'stream', text, defaultUrl);
    }
};