const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');
const { db } = require('../../database');

module.exports = {
    name: 'wl',
    aliases: ['whitelist'],
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return sendV2Message(client, message.channel.id, await t('wl.owner_only', message.guild.id), []);

        if (!args[0]) {
            // List whitelist
            const wls = db.prepare('SELECT user_id FROM whitelists WHERE guild_id = ?').all(message.guild.id);
            if (wls.length === 0) return sendV2Message(client, message.channel.id, await t('wl.empty', message.guild.id), []);
            
            return sendV2Message(client, message.channel.id, await t('wl.list', message.guild.id, { users: wls.map(w => `<@${w.user_id}>`).join(', ') }), []);
        }

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return sendV2Message(client, message.channel.id, await t('wl.not_found', message.guild.id), []);

        db.prepare('INSERT OR REPLACE INTO whitelists (guild_id, user_id, level) VALUES (?, ?, ?)')
          .run(message.guild.id, user.id, 'wl');
        
        sendV2Message(client, message.channel.id, await t('wl.added', message.guild.id, { user: user.tag }), []);
    }
};
