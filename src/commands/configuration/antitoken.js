const { db } = require('../../database');
const ms = require('ms');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'antitoken',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('antitoken.usage', message.guild.id), []);

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'lock'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET antitoken_level = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return sendV2Message(client, message.channel.id, await t('antitoken.state_success', message.guild.id, { state: arg }), []);
        }

        // Handle limit configuration: 5/10s
        if (arg.includes('/')) {
            const [count, duration] = arg.split('/');
            const timeMs = ms(duration);
            
            if (!count || !timeMs) return sendV2Message(client, message.channel.id, await t('antitoken.invalid_format', message.guild.id), []);

            db.prepare('UPDATE guild_settings SET antitoken_limit = ?, antitoken_time = ? WHERE guild_id = ?')
              .run(parseInt(count), timeMs, message.guild.id);
            
            return sendV2Message(client, message.channel.id, await t('antitoken.config_success', message.guild.id, { count, duration }), []);
        }
    }
};
