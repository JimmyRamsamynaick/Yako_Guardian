const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { showJoinMenu } = require('../../handlers/notificationHandler');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'join',
    description: 'Configure les messages de bienvenue',
    async execute(client, message, args) {
        if (args.length === 0) {
             return message.channel.send({ embeds: [createEmbed(await t('join.usage', message.guild.id), '', 'error')] });
        }

        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('join.permission', message.guild.id), '', 'error')] });
            }

            const config = await getGuildConfig(message.guild.id);
            await showJoinMenu(message, config);
        } else {
            // +join <channel> <message>
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('join.permission', message.guild.id), '', 'error')] });
            }

            const channelId = args[0].replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel) {
                return message.channel.send({ embeds: [createEmbed(await t('join.usage', message.guild.id), '', 'error')] });
            }

            const msgContent = args.slice(1).join(' ');
            if (!msgContent) {
                return message.channel.send({ embeds: [createEmbed(await t('join.usage', message.guild.id), '', 'error')] });
            }

            const config = await getGuildConfig(message.guild.id);
            config.welcome.enabled = true;
            config.welcome.channelId = channel.id;
            config.welcome.message = msgContent;
            await config.save();

            message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id) + ` Message de bienvenue configuré pour ${channel}.`, '', 'success')] });
        }
    }
};
