const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showLeaveMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'leave',
    description: 'Configure les messages de départ',
    async execute(client, message, args) {
        if (args.length === 0) {
             return sendV2Message(client, message.channel.id, await t('leave.usage', message.guild.id), []);
        }

        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('leave.permission', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showLeaveMenu(message, config);
        } else {
             // +leave <channel> <message>
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('leave.permission', message.guild.id), []);
            }

            const channelId = args[0].replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel) {
                return sendV2Message(client, message.channel.id, await t('leave.usage', message.guild.id), []);
            }

            const msgContent = args.slice(1).join(' ');
            if (!msgContent) {
                return sendV2Message(client, message.channel.id, await t('leave.usage', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            config.leave.enabled = true;
            config.leave.channelId = channel.id;
            config.leave.message = msgContent;
            await config.save();

            sendV2Message(client, message.channel.id, await t('common.success', message.guild.id) + ` Message de départ configuré pour ${channel}.`, []);
        }
    }
};
