const { t } = require('../../utils/i18n');
const { db } = require('../../database');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'wl',
    aliases: ['whitelist'],
    category: 'Configuration',
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('wl.owner_only', message.guild.id), 'error')] });

        if (!args[0]) {
            // List whitelist
            const wls = db.prepare('SELECT user_id FROM whitelists WHERE guild_id = ?').all(message.guild.id);
            
            const embed = createEmbed(
                await t('wl.title', message.guild.id),
                wls.length === 0 ? await t('wl.empty', message.guild.id) : await t('wl.list_description', message.guild.id),
                'info',
                { guildId: message.guild.id }
            );

            if (wls.length > 0) {
                const userList = wls.map(w => `<@${w.user_id}>`).join('\n');
                embed.addFields({
                    name: await t('wl.field_users', message.guild.id, { count: wls.length }),
                    value: userList,
                    inline: false
                });
            }
            
            return message.channel.send({ embeds: [embed] });
        }

        const user = message.mentions.users.first() || client.users.cache.get(args[0]);
        if (!user) return message.channel.send({ embeds: [createEmbed('Erreur', await t('wl.not_found', message.guild.id), 'error')] });

        db.prepare('INSERT OR REPLACE INTO whitelists (guild_id, user_id, level) VALUES (?, ?, ?)')
          .run(message.guild.id, user.id, 'wl');
        
        message.channel.send({ embeds: [createEmbed('Succès', await t('wl.added', message.guild.id, { user: user.tag }), 'success')] });
    }
};
