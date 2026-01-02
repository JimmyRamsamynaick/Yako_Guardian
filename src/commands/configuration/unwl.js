const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'unwl',
    aliases: ['unwhitelist'],
    run: async (client, message, args) => {
        if (message.author.id !== message.guild.ownerId) return sendV2Message(client, message.channel.id, await t('unwl.owner_only', message.guild.id), []);

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return sendV2Message(client, message.channel.id, await t('unwl.not_found', message.guild.id), []);

        db.prepare('DELETE FROM whitelists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, user.id);
        
        sendV2Message(client, message.channel.id, await t('unwl.success', message.guild.id, { user: user.tag }), []);
    }
};
