const { t } = require('../../utils/i18n');
const { db } = require('../../database');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'wl',
    aliases: ['whitelist'],
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('wl.owner_only', message.guild.id), 'error')] });

        if (!args[0]) {
            // List whitelist
            const wls = db.prepare('SELECT user_id FROM whitelists WHERE guild_id = ?').all(message.guild.id);
            if (wls.length === 0) return message.channel.send({ embeds: [createEmbed('Whitelist', await t('wl.empty', message.guild.id), 'info')] });
            
            return message.channel.send({ embeds: [createEmbed('Whitelist', await t('wl.list', message.guild.id, { users: wls.map(w => `<@${w.user_id}>`).join(', ') }), 'info')] });
        }

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.channel.send({ embeds: [createEmbed('Erreur', await t('wl.not_found', message.guild.id), 'error')] });

        db.prepare('INSERT OR REPLACE INTO whitelists (guild_id, user_id, level) VALUES (?, ?, ?)')
          .run(message.guild.id, user.id, 'wl');
        
        message.channel.send({ embeds: [createEmbed('Succès', await t('wl.added', message.guild.id, { user: user.tag }), 'success')] });
    }
};
