const { db } = require('../../database');

module.exports = {
    name: 'unwl',
    aliases: ['unwhitelist'],
    run: async (client, message, args) => {
        if (message.author.id !== message.guild.ownerId) return message.reply('Seul le propriétaire peut gérer la whitelist.');

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.reply('Utilisateur introuvable.');

        db.prepare('DELETE FROM whitelists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, user.id);
        
        message.reply(`${user.tag} a été retiré de la whitelist.`);
    }
};
