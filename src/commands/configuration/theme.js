const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'theme',
    description: 'Change la couleur des embeds du bot',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('theme.permission', message.guild.id), []);
        }

        const color = args[0];
        if (!color) {
            return sendV2Message(client, message.channel.id, await t('theme.usage', message.guild.id), []);
        }

        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        if (!hexRegex.test(color)) {
             return sendV2Message(client, message.channel.id, await t('theme.invalid_color', message.guild.id), []);
        }

        db.prepare('UPDATE guild_settings SET theme_color = ? WHERE guild_id = ?').run(color, message.guild.id);
        
        return sendV2Message(client, message.channel.id, await t('theme.success', message.guild.id, { color }), []);
    }
};
