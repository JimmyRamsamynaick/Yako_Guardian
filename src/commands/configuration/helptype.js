const { createEmbed } = require('../../utils/design');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'helptype',
    description: 'Configure le style du menu d\'aide (Button, Select, Hybrid)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return message.channel.send({ embeds: [createEmbed(await t('helptype.permission', message.guild.id), '', 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        const prefix = config.prefix || client.config.prefix;

        const type = args[0]?.toLowerCase();
        if (!type || !['button', 'select', 'hybrid'].includes(type)) {
            return message.channel.send({ embeds: [createEmbed(await t('helptype.usage', message.guild.id, { prefix }), '', 'info')] });
        }

        db.prepare('UPDATE guild_settings SET help_type = ? WHERE guild_id = ?').run(type, message.guild.id);
        return message.channel.send({ embeds: [createEmbed(await t('helptype.success', message.guild.id, { type: type.toUpperCase() }), '', 'success')] });
    }
};
