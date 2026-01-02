const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autothread',
    description: 'Crée automatiquement un fil de discussion pour chaque message',
    category: 'Automation',
    usage: 'autothread <on/off/add/del> [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.automations) config.automations = {};
        if (!config.automations.autothread) config.automations.autothread = { enabled: false, channels: [] };

        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            config.automations.autothread.enabled = true;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'off') {
            config.automations.autothread.enabled = false;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'add') {
            const channel = message.mentions.channels.first() || message.channel;
            if (!config.automations.autothread.channels.includes(channel.id)) {
                config.automations.autothread.channels.push(channel.id);
                await config.save();
            }
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'del') {
            const channel = message.mentions.channels.first() || message.channel;
            const idx = config.automations.autothread.channels.indexOf(channel.id);
            if (idx > -1) {
                config.automations.autothread.channels.splice(idx, 1);
                await config.save();
            }
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });
    }
};
