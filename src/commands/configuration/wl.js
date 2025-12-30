const { db } = require('../../database');

module.exports = {
    name: 'wl',
    aliases: ['whitelist'],
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return message.reply('Seul le propriétaire peut gérer la whitelist.');

        if (!args[0]) {
            // List whitelist
            const wls = db.prepare('SELECT user_id FROM whitelists WHERE guild_id = ?').all(message.guild.id);
            if (wls.length === 0) return message.reply('Aucun utilisateur dans la whitelist.');
            
            return message.reply(`**Whitelist:**\n${wls.map(w => `<@${w.user_id}>`).join(', ')}`);
        }

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.reply('Utilisateur introuvable.');

        db.prepare('INSERT OR REPLACE INTO whitelists (guild_id, user_id, level) VALUES (?, ?, ?)')
          .run(message.guild.id, user.id, 'wl');
        
        message.reply(`${user.tag} a été ajouté à la whitelist.`);
    }
};
