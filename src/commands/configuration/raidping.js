const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'raidping',
    category: 'Configuration',
    run: async (client, message, args) => {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed('Usage', await t('raidping.usage', message.guild.id), 'info')] });
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.channel.send({ embeds: [createEmbed('Erreur', await t('raidping.role_not_found', message.guild.id), 'error')] });

        db.prepare('UPDATE guild_settings SET raid_ping_role = ? WHERE guild_id = ?').run(role.id, message.guild.id);
        message.channel.send({ embeds: [createEmbed('Succès', await t('raidping.success', message.guild.id, { role: role.name }), 'success')] });
    }
};
