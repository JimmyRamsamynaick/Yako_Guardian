const { db } = require('../../database');
const ms = require('ms');

module.exports = {
    name: 'creation',
    run: async (client, message, args) => {
        if (args[0] === 'limit') {
            if (!args[1]) return message.reply('Usage: +creation limit <durée>');
            
            const timeMs = ms(args[1]);
            if (!timeMs) return message.reply('Durée invalide.');

            db.prepare('UPDATE guild_settings SET creation_limit_time = ? WHERE guild_id = ?').run(timeMs, message.guild.id);
            message.reply(`Limite de création de compte définie sur : **${args[1]}**`);
        }
    }
};
