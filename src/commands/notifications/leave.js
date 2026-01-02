const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showLeaveMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'leave',
    description: 'Configure les messages de départ',
    async execute(client, message, args) {
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('leave.permission', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showLeaveMenu(message, config);
        } else {
             sendV2Message(client, message.channel.id, await t('leave.usage', message.guild.id), []);
        }
    }
};
