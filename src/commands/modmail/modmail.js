const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showModmailMenu } = require('../../handlers/modmailInteractionHandler');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'modmail',
    description: 'Configure le système de Modmail',
    async execute(client, message, args) { // Added client parameter
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const { sendV2Message } = require('../../utils/componentUtils');
            return sendV2Message(client, message.channel.id, await t('modmail.permission', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        await showModmailMenu(client, message, config);
    }
};
