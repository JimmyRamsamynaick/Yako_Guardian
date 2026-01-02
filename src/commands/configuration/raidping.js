const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'raidping',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('raidping.usage', message.guild.id), []);
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return sendV2Message(client, message.channel.id, await t('raidping.role_not_found', message.guild.id), []);

        db.prepare('UPDATE guild_settings SET raid_ping_role = ? WHERE guild_id = ?').run(role.id, message.guild.id);
        sendV2Message(client, message.channel.id, await t('raidping.success', message.guild.id, { role: role.name }), []);
    }
};
