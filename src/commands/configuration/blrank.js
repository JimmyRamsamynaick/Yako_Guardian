const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'blrank',
    run: async (client, message, args) => {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed('Usage', await t('blrank.usage', message.guild.id), 'info')] });

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'max'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET blrank_state = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.state_set', message.guild.id, { state: arg }), 'success')] });
        }

        if (['danger', 'all'].includes(arg)) {
             db.prepare('UPDATE guild_settings SET blrank_type = ? WHERE guild_id = ?').run(arg, message.guild.id);
             return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.type_set', message.guild.id, { type: arg }), 'success')] });
        }

        if (arg === 'add' || arg === 'del') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return message.channel.send({ embeds: [createEmbed('Erreur', await t('blrank.user_not_found', message.guild.id), 'error')] });

            if (arg === 'add') {
                db.prepare('INSERT OR REPLACE INTO blacklists (guild_id, user_id, reason) VALUES (?, ?, ?)')
                  .run(message.guild.id, user.id, await t('blrank.manual_reason', message.guild.id));
                return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.added', message.guild.id, { tag: user.tag }), 'success')] });
            } else {
                db.prepare('DELETE FROM blacklists WHERE guild_id = ? AND user_id = ?')
                  .run(message.guild.id, user.id);
                return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.removed', message.guild.id, { tag: user.tag }), 'success')] });
            }
        }
    }
};
