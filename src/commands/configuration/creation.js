const { db } = require('../../database');
const ms = require('ms');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'creation',
    run: async (client, message, args) => {
        if (args[0] === 'limit') {
            if (!args[1]) return sendV2Message(client, message.channel.id, 'Usage: +creation limit <durée>', []);
            
            const timeMs = ms(args[1]);
            if (!timeMs) return sendV2Message(client, message.channel.id, 'Durée invalide.', []);

            db.prepare('UPDATE guild_settings SET creation_limit_time = ? WHERE guild_id = ?').run(timeMs, message.guild.id);
            sendV2Message(client, message.channel.id, `Limite de création de compte définie sur : **${args[1]}**`, []);
        }
    }
};
