const { db } = require('../../database');
const ms = require('ms');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'antitoken',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, 'Usage: +antitoken <on/off/lock> OU +antitoken <nombre>/<durée>', []);

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'lock'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET antitoken_level = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return sendV2Message(client, message.channel.id, `Antitoken défini sur : **${arg}**`, []);
        }

        // Handle limit configuration: 5/10s
        if (arg.includes('/')) {
            const [count, duration] = arg.split('/');
            const timeMs = ms(duration);
            
            if (!count || !timeMs) return sendV2Message(client, message.channel.id, 'Format invalide. Exemple: +antitoken 5/10s', []);

            db.prepare('UPDATE guild_settings SET antitoken_limit = ?, antitoken_time = ? WHERE guild_id = ?')
              .run(parseInt(count), timeMs, message.guild.id);
            
            return sendV2Message(client, message.channel.id, `Antitoken configuré : **${count}** comptes max en **${duration}**.`, []);
        }
    }
};
