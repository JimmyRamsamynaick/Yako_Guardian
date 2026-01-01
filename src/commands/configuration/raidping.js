const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'raidping',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, 'Usage: +raidping <@role/ID>', []);
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return sendV2Message(client, message.channel.id, 'Rôle introuvable.', []);

        db.prepare('UPDATE guild_settings SET raid_ping_role = ? WHERE guild_id = ?').run(role.id, message.guild.id);
        sendV2Message(client, message.channel.id, `Rôle de ping antiraid défini sur : **${role.name}**`, []);
    }
};
