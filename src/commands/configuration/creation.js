const { db } = require('../../database');
const ms = require('ms');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'creation',
    run: async (client, message, args) => {
        if (args[0] === 'limit') {
            if (!args[1]) return sendV2Message(client, message.channel.id, await t('creation.usage', message.guild.id), []);
            
            const timeMs = ms(args[1]);
            if (!timeMs) return sendV2Message(client, message.channel.id, await t('creation.invalid_duration', message.guild.id), []);

            db.prepare('UPDATE guild_settings SET creation_limit_time = ? WHERE guild_id = ?').run(timeMs, message.guild.id);
            sendV2Message(client, message.channel.id, await t('creation.success', message.guild.id, { duration: args[1] }), []);
        }
    }
};
