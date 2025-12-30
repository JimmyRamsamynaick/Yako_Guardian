const { db } = require('../../database');
const ms = require('ms');

module.exports = {
    name: 'antitoken',
    run: async (client, message, args) => {
        if (!args[0]) return message.reply('Usage: +antitoken <on/off/lock> OU +antitoken <nombre>/<durée>');

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'lock'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET antitoken_level = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return message.reply(`Antitoken défini sur : **${arg}**`);
        }

        // Handle limit configuration: 5/10s
        if (arg.includes('/')) {
            const [count, duration] = arg.split('/');
            const timeMs = ms(duration);
            
            if (!count || !timeMs) return message.reply('Format invalide. Exemple: +antitoken 5/10s');

            db.prepare('UPDATE guild_settings SET antitoken_limit = ?, antitoken_time = ? WHERE guild_id = ?')
              .run(parseInt(count), timeMs, message.guild.id);
            
            return message.reply(`Antitoken configuré : **${count}** comptes max en **${duration}**.`);
        }
    }
};
