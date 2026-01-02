const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'delperm',
    description: 'Supprime les permissions personnalisées d\'un rôle',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('delperm.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.channel.send({ embeds: [createEmbed(
            await t('delperm.usage', message.guild.id),
            '',
            'error'
        )] });

        const config = await getGuildConfig(message.guild.id);
        const initialLen = config.customPermissions.length;
        config.customPermissions = config.customPermissions.filter(p => p.roleId !== role.id);
        
        if (config.customPermissions.length === initialLen) {
            return message.channel.send({ embeds: [createEmbed(
                await t('delperm.not_found', message.guild.id, { role: role.name }),
                '',
                'error'
            )] });
        }

        await config.save();
        message.channel.send({ embeds: [createEmbed(
            await t('delperm.success', message.guild.id, { role: role.name }),
            '',
            'success'
        )] });
    }
};
