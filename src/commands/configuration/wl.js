const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'wl',
    aliases: ['whitelist'],
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return sendV2Message(client, message.channel.id, 'Seul le propriétaire peut gérer la whitelist.', []);

        if (!args[0]) {
            // List whitelist
            const wls = db.prepare('SELECT user_id FROM whitelists WHERE guild_id = ?').all(message.guild.id);
            if (wls.length === 0) return sendV2Message(client, message.channel.id, 'Aucun utilisateur dans la whitelist.', []);
            
            return sendV2Message(client, message.channel.id, `**Whitelist:**\n${wls.map(w => `<@${w.user_id}>`).join(', ')}`, []);
        }

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return sendV2Message(client, message.channel.id, 'Utilisateur introuvable.', []);

        db.prepare('INSERT OR REPLACE INTO whitelists (guild_id, user_id, level) VALUES (?, ?, ?)')
          .run(message.guild.id, user.id, 'wl');
        
        sendV2Message(client, message.channel.id, `${user.tag} a été ajouté à la whitelist.`, []);
    }
};
