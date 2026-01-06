const { db } = require('../../database');
const ms = require('ms');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'creation',
    category: 'Configuration',
    run: async (client, message, args) => {
        const sub = args[0]?.toLowerCase();

        if (sub === 'limit') {
            if (!args[1]) return message.channel.send({ embeds: [createEmbed('Usage', await t('creation.usage', message.guild.id), 'info')] });
            
            const timeMs = ms(args[1]);
            if (!timeMs) return message.channel.send({ embeds: [createEmbed('Erreur', await t('creation.invalid_duration', message.guild.id), 'error')] });

            db.prepare('UPDATE guild_settings SET creation_limit_time = ? WHERE guild_id = ?').run(timeMs, message.guild.id);
            return message.channel.send({ embeds: [createEmbed('Succès', await t('creation.success', message.guild.id, { duration: args[1] }), 'success')] });
        }

        if (sub === 'off' || sub === 'disable') {
             db.prepare('UPDATE guild_settings SET creation_limit_time = 0 WHERE guild_id = ?').run(message.guild.id);
             return message.channel.send({ embeds: [createEmbed('Succès', await t('creation.disabled', message.guild.id), 'success')] });
        }

        // Default: Show help and current status
        const settings = db.prepare('SELECT creation_limit_time FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        const currentLimit = settings?.creation_limit_time 
            ? ms(settings.creation_limit_time, { long: true }) 
            : await t('creation.none', message.guild.id);

        const embed = createEmbed(
            await t('creation.help_title', message.guild.id),
            await t('creation.description', message.guild.id),
            'info'
        );
        
        embed.addFields([
            { name: await t('creation.current_limit', message.guild.id), value: `${currentLimit}`, inline: true },
            { name: 'Usage', value: `\`+creation limit <time>\`\n\`+creation off\``, inline: false }
        ]);

        return message.channel.send({ embeds: [embed] });
    }
};
