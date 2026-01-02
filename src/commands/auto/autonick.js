const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autonick',
    description: 'Configure le changement de pseudo automatique',
    category: 'Automation',
    usage: 'autonick <on/off/mask> [valeur]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.automations) config.automations = {};
        if (!config.automations.autonick) config.automations.autonick = { enabled: false };

        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            config.automations.autonick.enabled = true;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'off') {
            config.automations.autonick.enabled = false;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'mask') {
            const mask = args.slice(1).join(' ');
            if (!mask) return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });
            
            config.automations.autonick.mask = mask;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });
    }
};
