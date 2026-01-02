const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'remove',
    description: 'Supprimer des configurations ou retirer un membre d\'un ticket',
    category: 'Configuration',
    aliases: ['del', 'delete'],
    async run(client, message, args) {
        // --- TICKET CHECK ---
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (ticket) {
             const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
             if (member) {
                try {
                    await message.channel.permissionOverwrites.edit(member, {
                        ViewChannel: false,
                        SendMessages: false,
                        ReadMessageHistory: false
                    });
                    return message.channel.send({ embeds: [createEmbed(
                        await t('remove.ticket_removed', message.guild.id, { id: member.id }),
                        '',
                        'success'
                    )] });
                } catch (e) {
                    return message.channel.send({ embeds: [createEmbed(
                        await t('remove.ticket_error', message.guild.id),
                        '',
                        'error'
                    )] });
                }
             }
        }

        // --- STANDARD CONFIGURATION REMOVE ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('remove.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'perm' || sub === 'permission') {
            const targetStr = args[1];
            if (!targetStr) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('remove.usage_perm', message.guild.id),
                    '',
                    'info'
                )] });
            }

            let roleId = null;
            if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
            else {
                const id = targetStr.replace(/[<@&>]/g, '');
                if (message.guild.roles.cache.has(id)) roleId = id;
            }

            if (!roleId) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('remove.role_required', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.customPermissions || config.customPermissions.length === 0) {
                 return message.channel.send({ embeds: [createEmbed(
                    await t('remove.no_perms', message.guild.id),
                    '',
                    'error'
                 )] });
            }

            const initialLength = config.customPermissions.length;
            config.customPermissions = config.customPermissions.filter(p => p.roleId !== roleId);
            const deletedCount = initialLength - config.customPermissions.length;

            if (deletedCount === 0) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('remove.role_no_perms', message.guild.id, { id: roleId }),
                    '',
                    'warning'
                )] });
            }

            await config.save();
            return message.channel.send({ embeds: [createEmbed(
                await t('remove.perm_success', message.guild.id, { count: deletedCount, id: roleId }),
                '',
                'success'
            )] });
        }

        if (sub === 'activity') {
            try {
                // Remove from DB
                db.prepare('UPDATE guild_settings SET bot_activity_type = NULL, bot_activity_text = NULL, bot_activity_url = NULL WHERE guild_id = ?').run(message.guild.id);
                
                // Clear current activity (if it was this guild's turn, or just to be responsive)
                client.user.setActivity(null);

                return message.channel.send({ embeds: [createEmbed(
                    await t('remove.activity_success', message.guild.id),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('remove.activity_error', message.guild.id, { error: e.message }),
                    '',
                    'error'
                )] });
            }
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('remove.usage_activity', message.guild.id),
            '',
            'info'
        )] });
    }
};