const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'role',
    description: 'Informations détaillées sur un rôle',
    category: 'Utils',
    async run(client, message, args) {
        const roleId = args[0]?.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);

        if (!role) {
            return message.channel.send({ embeds: [createEmbed(await t('role.not_found', message.guild.id), '', 'error')] });
        }

        const info = [
            `**${await t('role.name', message.guild.id)}:** ${role.name}`,
            `**${await t('role.id', message.guild.id)}:** ${role.id}`,
            `**${await t('role.color', message.guild.id)}:** ${role.hexColor}`,
            `**${await t('role.mentionable', message.guild.id)}:** ${role.mentionable ? await t('role.yes', message.guild.id) : await t('role.no', message.guild.id)}`,
            `**${await t('role.hoist', message.guild.id)}:** ${role.hoist ? await t('role.yes', message.guild.id) : await t('role.no', message.guild.id)}`,
            `**${await t('role.position', message.guild.id)}:** ${role.position}`,
            `**${await t('role.members', message.guild.id)}:** ${role.members.size}`,
            `**${await t('role.created_at', message.guild.id)}:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`
        ].join('\n');

        await message.channel.send({ embeds: [createEmbed(await t('role.title', message.guild.id, { name: role.name }), info, 'info')] });
    }
};