const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'delrole',
    description: 'Retire un rôle à un membre',
    category: 'Moderation',
    usage: 'delrole <user> <role>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageRoles' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
            return sendV2Message(client, message.channel.id, await t('common.role_not_found', message.guild.id), []);
        }

        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('moderation.role_higher_user', message.guild.id), []);
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return sendV2Message(client, message.channel.id, await t('moderation.role_higher_bot', message.guild.id), []);
        }

        try {
            await targetMember.roles.remove(role);
            return sendV2Message(client, message.channel.id, await t('moderation.delrole_success', message.guild.id, { role: role.name, user: targetMember.user.tag }), []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, await t('moderation.delrole_error', message.guild.id), []);
        }
    }
};
