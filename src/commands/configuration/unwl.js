const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'unwl',
    aliases: ['unwhitelist'],
    run: async (client, message, args) => {
        if (message.author.id !== message.guild.ownerId) return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('unwl.owner_only', message.guild.id), 'error')] });

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.channel.send({ embeds: [createEmbed('Erreur', await t('unwl.not_found', message.guild.id), 'error')] });

        db.prepare('DELETE FROM whitelists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, user.id);
        
        message.channel.send({ embeds: [createEmbed('Succès', await t('unwl.success', message.guild.id, { user: user.tag }), 'success')] });
    }
};
