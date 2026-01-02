const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autoslowmode',
    description: 'Configure le slowmode automatique (simple)',
    category: 'Automation',
    usage: 'autoslowmode <on/off/add/del> [channel] [time]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.automations) config.automations = {};
        if (!config.automations.autoslowmode) config.automations.autoslowmode = { enabled: false, channels: [] };

        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            config.automations.autoslowmode.enabled = true;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'off') {
            config.automations.autoslowmode.enabled = false;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        // Implementation of adding channel with specific rate/time is complex in single command line args parsing
        // Simplified: +autoslowmode add #channel <seconds>
        
        if (sub === 'add') {
            const channel = message.mentions.channels.first();
            const time = parseInt(args[2]); // seconds
            
            if (!channel || isNaN(time)) return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });

            // Remove existing config for this channel
            config.automations.autoslowmode.channels = config.automations.autoslowmode.channels.filter(c => c.channelId !== channel.id);
            
            config.automations.autoslowmode.channels.push({
                channelId: channel.id,
                time: time
            });
            await config.save();

            // Apply immediately
            if (config.automations.autoslowmode.enabled) {
                channel.setRateLimitPerUser(time).catch(() => {});
            }

            return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        if (sub === 'del') {
             const channel = message.mentions.channels.first() || message.channel;
             config.automations.autoslowmode.channels = config.automations.autoslowmode.channels.filter(c => c.channelId !== channel.id);
             await config.save();
             
             // Remove slowmode
             channel.setRateLimitPerUser(0).catch(() => {});
             
             return message.channel.send({ embeds: [createEmbed(await t('common.success', message.guild.id), '', 'success')] });
        }

        return message.channel.send({ embeds: [createEmbed(await t('common.usage', message.guild.id), '', 'info')] });
    }
};
