const { db } = require('../../database');
const ms = require('ms');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'antitoken',
    description: 'Protège le serveur contre les raids de tokens (faux comptes)',
    category: 'Antiraid',
    run: async (client, message, args) => {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed(await t('antitoken.usage', message.guild.id), '', 'info')] });

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'lock'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET antitoken_level = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return message.channel.send({ embeds: [createEmbed(await t('antitoken.state_success', message.guild.id, { state: arg }), '', 'success')] });
        }

        // Handle limit configuration: 5/10s
        if (arg.includes('/')) {
            const [count, duration] = arg.split('/');
            const timeMs = ms(duration);
            
            if (!count || !timeMs) return message.channel.send({ embeds: [createEmbed(await t('antitoken.invalid_format', message.guild.id), '', 'error')] });

            db.prepare('UPDATE guild_settings SET antitoken_limit = ?, antitoken_time = ? WHERE guild_id = ?')
              .run(parseInt(count), timeMs, message.guild.id);
            
            return message.channel.send({ embeds: [createEmbed(await t('antitoken.config_success', message.guild.id, { count, duration }), '', 'success')] });
        }
    }
};
