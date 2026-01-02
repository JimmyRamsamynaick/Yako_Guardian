const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { setBotStatus } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'dnd',
    description: 'Change le statut du bot (Ne pas déranger)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('dnd.permission', message.guild.id), '', 'error')] });
        }
        await setBotStatus(client, message, 'dnd');
    }
};