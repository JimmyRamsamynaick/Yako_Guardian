const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'listen',
    description: 'Change l\'activité du bot (Écoute...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('listen.permission', message.guild.id), '', 'error')] });
        }

        const text = args.join(' ');
        if (!text) return message.channel.send({ embeds: [createEmbed(await t('listen.usage', message.guild.id), '', 'info')] });

        await setBotActivity(client, message, 'listen', text);
    }
};