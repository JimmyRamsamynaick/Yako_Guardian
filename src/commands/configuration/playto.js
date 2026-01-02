const { PermissionsBitField } = require('discord.js');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'playto',
    aliases: ['play'],
    description: 'Change l\'activité du bot (Joue à...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('playto.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(
            await t('playto.usage', message.guild.id),
            '',
            'info'
        )] });

        await setBotActivity(client, message, 'play', text);
    }
};