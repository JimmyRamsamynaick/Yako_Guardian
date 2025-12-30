const { db } = require('../../database');

module.exports = {
    name: 'raidping',
    run: async (client, message, args) => {
        if (!args[0]) return message.reply('Usage: +raidping <@role/ID>');
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.reply('Rôle introuvable.');

        db.prepare('UPDATE guild_settings SET raid_ping_role = ? WHERE guild_id = ?').run(role.id, message.guild.id);
        message.reply(`Rôle de ping antiraid défini sur : **${role.name}**`);
    }
};
