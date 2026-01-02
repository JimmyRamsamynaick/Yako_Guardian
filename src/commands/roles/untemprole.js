const TempRole = require('../../database/models/TempRole');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'untemprole',
    description: 'Retirer un rôle temporaire et annuler le timer',
    category: 'Rôles',
    async run(client, message, args) {
        // Permissions
        if (!message.member.permissions.has('ManageRoles') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.temprole.permission_manage_roles', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!member || !role) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.untemprole.usage', message.guild.id), '', 'error')] });
        }

        try {
            // Remove from DB
            const result = await TempRole.deleteOne({ 
                guild_id: message.guild.id, 
                user_id: member.id, 
                role_id: role.id 
            });

            // Remove role from user
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            }

            if (result.deletedCount > 0) {
                message.channel.send({ embeds: [createEmbed(await t('roles.untemprole.success', message.guild.id, { user: member.user.tag }), '', 'success')] });
            } else {
                message.channel.send({ embeds: [createEmbed(await t('roles.untemprole.warning_not_temp', message.guild.id), '', 'error')] });
            }

        } catch (error) {
            console.error(error);
            message.channel.send({ embeds: [createEmbed(await t('roles.untemprole.error', message.guild.id), '', 'error')] });
        }
    }
};