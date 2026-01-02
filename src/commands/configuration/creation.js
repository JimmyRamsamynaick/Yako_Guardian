const { db } = require('../../database');
const ms = require('ms');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'creation',
    run: async (client, message, args) => {
        if (args[0] === 'limit') {
            if (!args[1]) return message.channel.send({ embeds: [createEmbed('Usage', await t('creation.usage', message.guild.id), 'info')] });
            
            const timeMs = ms(args[1]);
            if (!timeMs) return message.channel.send({ embeds: [createEmbed('Erreur', await t('creation.invalid_duration', message.guild.id), 'error')] });

            db.prepare('UPDATE guild_settings SET creation_limit_time = ? WHERE guild_id = ?').run(timeMs, message.guild.id);
            message.channel.send({ embeds: [createEmbed('Succès', await t('creation.success', message.guild.id, { duration: args[1] }), 'success')] });
        }
    }
};
