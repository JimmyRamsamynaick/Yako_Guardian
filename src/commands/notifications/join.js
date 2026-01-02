const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showJoinMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'join',
    description: 'Configure les messages de bienvenue',
    async execute(client, message, args) {
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('join.permission', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showJoinMenu(message, config);
        } else {
             // Handle other join subcommands if any, or help
             sendV2Message(client, message.channel.id, await t('join.usage', message.guild.id), []);
        }
    }
};
