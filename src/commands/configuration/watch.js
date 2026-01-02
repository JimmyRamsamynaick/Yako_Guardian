const { PermissionsBitField } = require('discord.js');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'watch',
    description: 'Change l\'activité du bot (Regarde...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('watch.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(
            await t('watch.usage', message.guild.id),
            '',
            'info'
        )] });

        await setBotActivity(client, message, 'watch', text);
    }
};