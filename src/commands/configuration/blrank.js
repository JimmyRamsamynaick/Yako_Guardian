const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'blrank',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, 'Usage: +blrank <on/off/max> | <add/del> <user> | <danger/all>', []);

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'max'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET blrank_state = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return sendV2Message(client, message.channel.id, `Blacklist Rank définie sur : **${arg}**`, []);
        }

        if (['danger', 'all'].includes(arg)) {
             db.prepare('UPDATE guild_settings SET blrank_type = ? WHERE guild_id = ?').run(arg, message.guild.id);
             return sendV2Message(client, message.channel.id, `Type de Blacklist Rank : **${arg}**`, []);
        }

        if (arg === 'add' || arg === 'del') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return sendV2Message(client, message.channel.id, 'Utilisateur introuvable.', []);

            if (arg === 'add') {
                db.prepare('INSERT OR REPLACE INTO blacklists (guild_id, user_id, reason) VALUES (?, ?, ?)')
                  .run(message.guild.id, user.id, 'Manually blacklisted');
                return sendV2Message(client, message.channel.id, `${user.tag} ajouté à la blacklist.`, []);
            } else {
                db.prepare('DELETE FROM blacklists WHERE guild_id = ? AND user_id = ?')
                  .run(message.guild.id, user.id);
                return sendV2Message(client, message.channel.id, `${user.tag} retiré de la blacklist.`, []);
            }
        }
    }
};
