const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autorole',
    description: 'Configure le rôle automatique à l\'arrivée',
    category: 'Automation',
    usage: 'autorole <on/off/role/botrole> [valeur]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.automations) config.automations = {};
        if (!config.automations.autorole) config.automations.autorole = { enabled: false };

        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            config.automations.autorole.enabled = true;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'off') {
            config.automations.autorole.enabled = false;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'role') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return message.channel.send({ embeds: [createEmbed(await t('common.role_not_found', message.guild.id), '', 'error')] });
            
            config.automations.autorole.roleId = role.id;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'botrole') {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) return message.channel.send({ embeds: [createEmbed(await t('common.role_not_found', message.guild.id), '', 'error')] });
            
            config.automations.autorole.botRoleId = role.id;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });
    }
};
