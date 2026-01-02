const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'muterole',
    description: 'Affiche ou configure le rôle Mute',
    category: 'Configuration',
    usage: 'muterole [role]',
    aliases: ['mr'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        const config = await getGuildConfig(message.guild.id);
        
        // If args provided, redirect to set
        if (args[0]) {
             const roleId = args[0].replace(/[<@&>]/g, '');
             const role = message.guild.roles.cache.get(roleId);
             if (!role) return message.channel.send({ embeds: [createEmbed(
                 await t('common.role_not_found', message.guild.id),
                 '',
                 'error'
             )] });
             
             if (!config.moderation) config.moderation = {};
             config.moderation.muteRole = role.id;
             config.markModified('moderation');
             await config.save();
             return message.channel.send({ embeds: [createEmbed(
                 await t('muterole.set_success', message.guild.id, { role: role.toString() }),
                 '',
                 'success'
             )] });
        }

        // Show current
        const roleId = config.moderation?.muteRole;
        if (!roleId) {
            return message.channel.send({ embeds: [createEmbed(
                await t('muterole.not_set', message.guild.id),
                '',
                'warning'
            )] });
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
             return message.channel.send({ embeds: [createEmbed(
                 await t('muterole.not_set', message.guild.id) + " (Role ID invalid)",
                 '',
                 'warning'
             )] });
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('muterole.current', message.guild.id, { role: role.toString() }),
            '',
            'info'
        )] });
    }
};
