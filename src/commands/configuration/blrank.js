const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'blrank',
    category: 'Configuration',
    run: async (client, message, args) => {
        if (!args[0]) {
            const settings = db.prepare('SELECT blrank_state FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            const currentState = settings ? settings.blrank_state : 'off';
            const statusMsg = currentState === 'off' 
                ? await t('blrank.status_off_msg', message.guild.id)
                : await t('blrank.status_on_msg', message.guild.id);

            const embed = createEmbed(
                await t('blrank.help_title', message.guild.id),
                await t('blrank.description', message.guild.id) + '\n\n' + await t('blrank.current_status', message.guild.id, { status: statusMsg }),
                currentState === 'off' ? 'warning' : 'info'
            );
            
            embed.addFields([
                { name: 'État', value: `${await t('blrank.help_on', message.guild.id)}\n${await t('blrank.help_off', message.guild.id)}\n${await t('blrank.help_max', message.guild.id)}`, inline: false },
                { name: 'Type', value: `${await t('blrank.help_danger', message.guild.id)}\n${await t('blrank.help_all', message.guild.id)}`, inline: false },
                { name: 'Gestion', value: `${await t('blrank.help_add', message.guild.id)}\n${await t('blrank.help_del', message.guild.id)}\n${await t('blrank.help_list', message.guild.id)}\n${await t('blrank.help_clear', message.guild.id)}`, inline: false }
            ]);

            return message.channel.send({ embeds: [embed] });
        }

        const arg = args[0].toLowerCase();

        if (arg === 'list') {
            const list = db.prepare('SELECT * FROM blacklists WHERE guild_id = ?').all(message.guild.id);
            if (list.length === 0) return message.channel.send({ embeds: [createEmbed(await t('blrank.list_title', message.guild.id, { count: 0 }), await t('blrank.list_empty', message.guild.id), 'info')] });

            const description = list.map(entry => `<@${entry.user_id}> (${entry.user_id})`).join('\n');
            // If description is too long, we should handle pagination or truncation. For now, let's truncate if > 4096.
            // A simple truncation.
            const truncatedDesc = description.length > 4090 ? description.substring(0, 4090) + '...' : description;

            return message.channel.send({ embeds: [createEmbed(await t('blrank.list_title', message.guild.id, { count: list.length }), truncatedDesc, 'info')] });
        }

        if (arg === 'clear') {
            const result = db.prepare('DELETE FROM blacklists WHERE guild_id = ?').run(message.guild.id);
            return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.clear_success', message.guild.id, { count: result.changes }), 'success')] });
        }

        if (['on', 'off', 'max'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET blrank_state = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.state_set', message.guild.id, { state: arg }), 'success')] });
        }

        if (['danger', 'all'].includes(arg)) {
             db.prepare('UPDATE guild_settings SET blrank_type = ? WHERE guild_id = ?').run(arg, message.guild.id);
             return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.type_set', message.guild.id, { type: arg }), 'success')] });
        }

        if (arg === 'add' || arg === 'del') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return message.channel.send({ embeds: [createEmbed('Erreur', await t('blrank.user_not_found', message.guild.id), 'error')] });

            if (arg === 'add') {
                db.prepare('INSERT OR REPLACE INTO blacklists (guild_id, user_id, reason) VALUES (?, ?, ?)')
                  .run(message.guild.id, user.id, await t('blrank.manual_reason', message.guild.id));
                
                let successMsg = await t('blrank.added', message.guild.id, { tag: user.tag });
                const settings = db.prepare('SELECT blrank_state FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
                
                // Check if module is OFF
                if (settings && settings.blrank_state === 'off') {
                    successMsg += await t('blrank.warning_off', message.guild.id);
                } else if (settings && settings.blrank_state !== 'off') {
                    // Check if member is in guild and ban
                    const member = await message.guild.members.fetch(user.id).catch(() => null);
                    if (member) {
                        try {
                            if (member.bannable) {
                                await member.ban({ reason: await t('blrank.manual_reason', message.guild.id) });
                                successMsg += await t('blrank.user_banned', message.guild.id);
                            } else {
                                // Maybe warn about permissions?
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }
                }

                return message.channel.send({ embeds: [createEmbed('Succès', successMsg, 'success')] });
            } else {
                db.prepare('DELETE FROM blacklists WHERE guild_id = ? AND user_id = ?')
                  .run(message.guild.id, user.id);
                return message.channel.send({ embeds: [createEmbed('Succès', await t('blrank.removed', message.guild.id, { tag: user.tag }), 'success')] });
            }
        }
    }
};
