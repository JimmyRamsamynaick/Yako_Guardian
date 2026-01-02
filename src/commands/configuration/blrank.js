const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'blrank',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('blrank.usage', message.guild.id), []);

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'max'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET blrank_state = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return sendV2Message(client, message.channel.id, await t('blrank.state_set', message.guild.id, { state: arg }), []);
        }

        if (['danger', 'all'].includes(arg)) {
             db.prepare('UPDATE guild_settings SET blrank_type = ? WHERE guild_id = ?').run(arg, message.guild.id);
             return sendV2Message(client, message.channel.id, await t('blrank.type_set', message.guild.id, { type: arg }), []);
        }

        if (arg === 'add' || arg === 'del') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return sendV2Message(client, message.channel.id, await t('blrank.user_not_found', message.guild.id), []);

            if (arg === 'add') {
                db.prepare('INSERT OR REPLACE INTO blacklists (guild_id, user_id, reason) VALUES (?, ?, ?)')
                  .run(message.guild.id, user.id, 'Manually blacklisted');
                return sendV2Message(client, message.channel.id, await t('blrank.added', message.guild.id, { tag: user.tag }), []);
            } else {
                db.prepare('DELETE FROM blacklists WHERE guild_id = ? AND user_id = ?')
                  .run(message.guild.id, user.id);
                return sendV2Message(client, message.channel.id, await t('blrank.removed', message.guild.id, { tag: user.tag }), []);
            }
        }
    }
};
