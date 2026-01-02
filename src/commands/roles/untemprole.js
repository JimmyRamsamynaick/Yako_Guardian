const TempRole = require('../../database/models/TempRole');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'untemprole',
    description: 'Retirer un rôle temporaire et annuler le timer',
    category: 'Rôles',
    async run(client, message, args) {
        // Permissions
        if (!message.member.permissions.has('ManageRoles') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('roles.temprole.permission_manage_roles', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!member || !role) {
            return sendV2Message(client, message.channel.id, await t('roles.untemprole.usage', message.guild.id), []);
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
                sendV2Message(client, message.channel.id, await t('roles.untemprole.success', message.guild.id, { user: member.user.tag }), []);
            } else {
                sendV2Message(client, message.channel.id, await t('roles.untemprole.warning_not_temp', message.guild.id), []);
            }

        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, await t('roles.untemprole.error', message.guild.id), []);
        }
    }
};