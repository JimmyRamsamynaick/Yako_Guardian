const { createEmbed } = require('../../utils/design');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'helptype',
    description: 'Configure le style du menu d\'aide (Button, Select, Hybrid)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return message.channel.send({ embeds: [createEmbed(await t('helptype.permission', message.guild.id), '', 'error')] });
        }

        const type = args[0]?.toLowerCase();

        // If argument is provided and valid, update the setting
        if (type && ['button', 'select', 'hybrid'].includes(type)) {
            db.prepare('UPDATE guild_settings SET help_type = ? WHERE guild_id = ?').run(type, message.guild.id);
            return message.channel.send({ embeds: [createEmbed(await t('helptype.success', message.guild.id, { type: type.toUpperCase() }), '', 'success')] });
        }

        // Otherwise, show the configuration panel
        const settings = db.prepare('SELECT help_type FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        const currentType = settings?.help_type ? settings.help_type.toUpperCase() : 'BUTTON (Default)';

        const embed = createEmbed(
            await t('helptype.help_title', message.guild.id),
            await t('helptype.description', message.guild.id),
            'info'
        );

        embed.addFields([
            { name: await t('helptype.current_type', message.guild.id), value: `\`${currentType}\``, inline: true },
            { name: 'Types', value: `${await t('helptype.help_button', message.guild.id)}\n${await t('helptype.help_select', message.guild.id)}\n${await t('helptype.help_hybrid', message.guild.id)}`, inline: false },
            { name: 'Usage', value: `\`+helptype <button/select/hybrid>\``, inline: false }
        ]);

        return message.channel.send({ embeds: [embed] });
    }
};
