const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'punition',
    category: 'Configuration',
    run: async (client, message, args) => {
        if (!args[0]) {
            const embed = createEmbed(
                await t('punition.help_title', message.guild.id),
                await t('punition.help_description', message.guild.id),
                'info',
                { guildId: message.guild.id }
            ).addFields([
                { 
                    name: await t('punition.field_type', message.guild.id), 
                    value: `${await t('punition.type_antiraid', message.guild.id)}\n${await t('punition.type_all', message.guild.id)}`, 
                    inline: false 
                },
                { 
                    name: await t('punition.field_sanction', message.guild.id), 
                    value: await t('punition.sanctions_list', message.guild.id), 
                    inline: false 
                },
                {
                    name: 'Usage',
                    value: await t('punition.usage', message.guild.id),
                    inline: false
                }
            ]);

            return message.channel.send({ embeds: [embed] });
        }

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
