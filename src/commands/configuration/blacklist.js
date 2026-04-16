const { t } = require('../../utils/i18n');
const { db } = require('../../database');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'blacklist',
    aliases: ['blguild'],
    category: 'Configuration',
    run: async (client, message, args) => {
        // Check if user is owner
        if (message.author.id !== message.guild.ownerId) return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('blacklist.owner_only', message.guild.id), 'error')] });

        if (!args[0]) {
            // List blacklist
            const bls = db.prepare('SELECT user_id FROM blacklists WHERE guild_id = ?').all(message.guild.id);
            
            const embed = createEmbed(
                await t('blacklist.title', message.guild.id),
                bls.length === 0 ? await t('blacklist.empty', message.guild.id) : await t('blacklist.list_description', message.guild.id),
                'info',
                { guildId: message.guild.id }
            );

            if (bls.length > 0) {
                const list = bls.map(b => {
                    const isRole = message.guild.roles.cache.has(b.user_id);
                    return isRole ? `<@&${b.user_id}> (Rôle)` : `<@${b.user_id}> (Utilisateur)`;
                }).join('\n');
                
                embed.addFields({
                    name: await t('blacklist.field_users', message.guild.id, { count: bls.length }),
                    value: list,
                    inline: false
                });
            }
            
            return message.channel.send({ embeds: [embed] });
        }

        const target = message.mentions.users.first() || 
                       message.mentions.roles.first() || 
                       message.guild.roles.cache.get(args[0]) || 
                       await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);

        if (!target) return message.channel.send({ embeds: [createEmbed('Erreur', await t('blacklist.not_found', message.guild.id), 'error')] });

        // Check if already in BL
        const exists = db.prepare('SELECT 1 FROM blacklists WHERE guild_id = ? AND user_id = ?').get(message.guild.id, target.id);
        
        if (exists) {
            db.prepare('DELETE FROM blacklists WHERE guild_id = ? AND user_id = ?').run(message.guild.id, target.id);
            const targetName = target.tag || target.name;
            return message.channel.send({ embeds: [createEmbed('Succès', await t('blacklist.removed', message.guild.id, { target: targetName }), 'success')] });
        } else {
            db.prepare('INSERT INTO blacklists (guild_id, user_id) VALUES (?, ?)')
              .run(message.guild.id, target.id);
            const targetName = target.tag || target.name;
            return message.channel.send({ embeds: [createEmbed('Succès', await t('blacklist.added', message.guild.id, { target: targetName }), 'success')] });
        }
    }
};
