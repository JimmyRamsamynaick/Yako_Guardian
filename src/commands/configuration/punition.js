const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'punition',
    run: async (client, message, args) => {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed(
            await t('punition.usage', message.guild.id),
            '',
            'info'
        )] });

        const type = args[0].toLowerCase(); // antiraid or all
        const sanction = args[1]?.toLowerCase();

        if (!['derank', 'kick', 'ban'].includes(sanction)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('punition.invalid_sanction', message.guild.id),
                '',
                'error'
            )] });
        }

        if (type === 'antiraid') {
            db.prepare('UPDATE guild_settings SET punition_antiraid = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            message.channel.send({ embeds: [createEmbed(
                await t('punition.success_antiraid', message.guild.id, { sanction }),
                '',
                'success'
            )] });
        } else if (type === 'all') {
            db.prepare('UPDATE guild_settings SET punition_all = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            message.channel.send({ embeds: [createEmbed(
                await t('punition.success_all', message.guild.id, { sanction }),
                '',
                'success'
            )] });
        }
    }
};
