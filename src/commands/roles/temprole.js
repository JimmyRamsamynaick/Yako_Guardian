const TempRole = require('../../database/models/TempRole');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

// Simple duration parser function
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's') return val * 1000;
    if (unit === 'm') return val * 60 * 1000;
    if (unit === 'h') return val * 60 * 60 * 1000;
    if (unit === 'd') return val * 24 * 60 * 60 * 1000;
    return null;
}

module.exports = {
    name: 'temprole',
    description: 'Donner un rôle temporaire à un membre',
    category: 'Rôles',
    async run(client, message, args) {
        // Permissions
        if (!message.member.permissions.has('ManageRoles') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.temprole.permission_manage_roles', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        const durationStr = args[2];

        if (!member || !role || !durationStr) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.temprole.usage', message.guild.id), '', 'error')] });
        }

        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.temprole.invalid_duration', message.guild.id), '', 'error')] });
        }

        // Check hierarchy
        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.temprole.role_hierarchy_error', message.guild.id), '', 'error')] });
        }

        try {
            await member.roles.add(role);
            
            const expiresAt = new Date(Date.now() + durationMs);
            
            // Save to DB
            const newTempRole = new TempRole({
                guild_id: message.guild.id,
                user_id: member.id,
                role_id: role.id,
                expires_at: expiresAt
            });
            await newTempRole.save();

            const successContent = `${await t('roles.temprole.success_member', message.guild.id, { user: member.user.tag })}\n` +
                `${await t('roles.temprole.success_role', message.guild.id, { role: role.name })}\n` +
                `${await t('roles.temprole.success_duration', message.guild.id, { duration: durationStr })}\n` +
                `${await t('roles.temprole.success_expires', message.guild.id, { time: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` })}`;

            message.channel.send({ embeds: [createEmbed(await t('roles.temprole.success_title', message.guild.id), successContent, 'success')] });

        } catch (error) {
            console.error(error);
            message.channel.send({ embeds: [createEmbed(await t('roles.temprole.error', message.guild.id), '', 'error')] });
        }
    }
};