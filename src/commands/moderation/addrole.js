const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'addrole',
    description: 'addrole.description',
    category: 'Moderation',
    usage: 'addrole.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageRoles' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args, 2)) return;

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('common.role_not_found', message.guild.id), 'error')] });
        }

        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.role_higher_user', message.guild.id), 'error')] });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.role_higher_bot', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('common.loading_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.addrole_process', message.guild.id)}`, 'loading')] });

        try {
            await targetMember.roles.add(role);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.addrole_success', message.guild.id, { role: role.name, user: targetMember.user.tag }), 'success')] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.addrole_error', message.guild.id), 'error')] });
        }
    }
};
