const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unwl',
    aliases: ['unwhitelist'],
    run: async (client, message, args) => {
        if (message.author.id !== message.guild.ownerId) return sendV2Message(client, message.channel.id, 'Seul le propriétaire peut gérer la whitelist.', []);

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return sendV2Message(client, message.channel.id, 'Utilisateur introuvable.', []);

        db.prepare('DELETE FROM whitelists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, user.id);
        
        sendV2Message(client, message.channel.id, `${user.tag} a été retiré de la whitelist.`, []);
    }
};
