const { db } = require('../../database');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'theme',
    description: 'Change la couleur des embeds du bot',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('theme.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const color = args[0];
        if (!color) {
            return message.channel.send({ embeds: [createEmbed(
                await t('theme.usage', message.guild.id),
                '',
                'info'
            )] });
        }

        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        if (!hexRegex.test(color)) {
             return message.channel.send({ embeds: [createEmbed(
                await t('theme.invalid_color', message.guild.id),
                '',
                'error'
             )] });
        }

        db.prepare('UPDATE guild_settings SET theme_color = ? WHERE guild_id = ?').run(color, message.guild.id);
        
        return message.channel.send({ embeds: [createEmbed(
            await t('theme.success', message.guild.id, { color }),
            '',
            'success'
        )] });
    }
};
