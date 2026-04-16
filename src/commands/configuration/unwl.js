const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'unwl',
    aliases: ['unwhitelist'],
    category: 'Configuration',
    run: async (client, message, args) => {
        if (message.author.id !== message.guild.ownerId) return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('unwl.owner_only', message.guild.id), 'error')] });

        const target = message.mentions.users.first() || 
                       message.mentions.roles.first() || 
                       message.guild.roles.cache.get(args[0]) || 
                       await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);

        if (!target) return message.channel.send({ embeds: [createEmbed('Erreur', await t('unwl.not_found', message.guild.id), 'error')] });

        db.prepare('DELETE FROM whitelists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, target.id);
        
        const targetName = target.tag || target.name;
        message.channel.send({ embeds: [createEmbed('Succès', await t('unwl.success', message.guild.id, { target: targetName }), 'success')] });
    }
};
