const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'raidlog',
    aliases: ['logs'],
    category: 'Configuration',
    run: async (client, message, args) => {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed('Usage', await t('raidlog.usage', message.guild.id), 'info')] });
        
        const state = args[0].toLowerCase();
        
        if (state === 'off') {
            db.prepare('UPDATE guild_settings SET raid_log_channel = NULL WHERE guild_id = ?').run(message.guild.id);
            return message.channel.send({ embeds: [createEmbed('Succès', await t('raidlog.disabled', message.guild.id), 'success')] });
        }
        
        if (state === 'on') {
            const channel = message.mentions.channels.first() || message.channel;
            db.prepare('UPDATE guild_settings SET raid_log_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
            
            // Send Test Log
            const embed = createEmbed(await t('raidlog.test_title', message.guild.id), await t('raidlog.test_desc', message.guild.id), 'success')
                .setFooter({ text: await t('raidlog.footer', message.guild.id) });

            channel.send({ embeds: [embed] }).catch(() => {});

            return message.channel.send({ embeds: [createEmbed('Succès', await t('raidlog.success', message.guild.id, { channel: channel.toString() }), 'success')] });
        }
    }
};
