const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showModmailMenu } = require('../../handlers/modmailInteractionHandler');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'modmail',
    description: 'Configure le système de Modmail',
    async execute(client, message, args) { // Added client parameter
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('modmail.permission', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        await showModmailMenu(client, message, config);
    }
};
