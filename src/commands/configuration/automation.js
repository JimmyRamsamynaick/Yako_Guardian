const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'automation',
    description: 'Configure les automatisations (autonick, autothread, autoslowmode)',
    category: 'Configuration',
    usage: 'automation <autonick/autothread/autoslowmode> [args]',
    aliases: ['auto'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.permission_missing', message.guild.id, { perm: 'Administrator' }),
                '',
                'error'
            )] });
        }

        const sub = args[0]?.toLowerCase();
        const config = await getGuildConfig(message.guild.id);
        
        // Ensure automations object exists
        if (!config.automations) config.automations = {};

        if (sub === 'autonick') {
            // +auto autonick set [Tag] {username}
            // +auto autonick disable
            const action = args[1]?.toLowerCase();
            if (action === 'set') {
                const format = args.slice(2).join(' ');
                if (!format) return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autonick_usage', message.guild.id),
                    '',
                    'info'
                )] });

                config.automations.autonick = {
                    enabled: true,
                    format: format
                };
                await config.save();
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autonick_set', message.guild.id, { format }),
                    '',
                    'success'
                )] });
            } else if (action === 'disable') {
                if (config.automations.autonick) {
                    config.automations.autonick.enabled = false;
                    await config.save();
                }
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autonick_disabled', message.guild.id),
                    '',
                    'success'
                )] });
            } else {
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autonick_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }
        } else if (sub === 'autothread') {
            // +auto autothread add #channel
            // +auto autothread remove #channel
            // +auto autothread list
            const action = args[1]?.toLowerCase();
            
            // Ensure autothread object
            if (!config.automations.autothread) config.automations.autothread = { enabled: true, channels: [] };

            if (action === 'add') {
                const channel = message.mentions.channels.first() || message.channel;
                if (!config.automations.autothread.channels.includes(channel.id)) {
                    config.automations.autothread.channels.push(channel.id);
                    config.automations.autothread.enabled = true; // Enable if added
                    await config.save();
                }
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autothread_added', message.guild.id, { channel: channel.toString() }),
                    '',
                    'success'
                )] });
            } else if (action === 'remove') {
                const channel = message.mentions.channels.first() || message.channel;
                config.automations.autothread.channels = config.automations.autothread.channels.filter(id => id !== channel.id);
                await config.save();
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autothread_removed', message.guild.id, { channel: channel.toString() }),
                    '',
                    'success'
                )] });
            } else if (action === 'list') {
                const channels = config.automations.autothread.channels.map(id => `<#${id}>`).join(', ') || 'Aucun';
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autothread_list', message.guild.id, { channels }),
                    '',
                    'info'
                )] });
            } else {
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autothread_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }
        } else if (sub === 'autoslowmode') {
            // +auto autoslowmode set 5 10 60 (If > 5 msgs in 10s -> slowmode 60s)
            // Simplified: +auto autoslowmode set <limit> <time> <duration>
            const action = args[1]?.toLowerCase();
             if (action === 'set') {
                const limit = parseInt(args[2]);
                const time = parseInt(args[3]); // interval
                const duration = parseInt(args[4]); // slowmode duration

                if (isNaN(limit) || isNaN(time) || isNaN(duration)) {
                     return message.channel.send({ embeds: [createEmbed(
                        await t('automation.autoslowmode_usage', message.guild.id),
                        '',
                        'info'
                     )] });
                }

                config.automations.autoslowmode = {
                    enabled: true,
                    limit: limit,
                    time: time * 1000, // store in ms
                    duration: duration
                };
                await config.save();
                return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autoslowmode_set', message.guild.id, { limit, time, duration }),
                    '',
                    'success'
                )] });

             } else if (action === 'disable') {
                 if (config.automations.autoslowmode) {
                     config.automations.autoslowmode.enabled = false;
                     await config.save();
                 }
                 return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autoslowmode_disabled', message.guild.id),
                    '',
                    'success'
                 )] });
             } else {
                 return message.channel.send({ embeds: [createEmbed(
                    await t('automation.autoslowmode_usage', message.guild.id),
                    '',
                    'info'
                 )] });
             }
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('automation.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
