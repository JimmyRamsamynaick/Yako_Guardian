const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { setBotStatus } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'idle',
    description: 'Change le statut du bot (Inactif)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('idle.permission', message.guild.id), '', 'error')] });
        }
        await setBotStatus(client, message, 'idle');
    }
};