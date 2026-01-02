const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');

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
                    return sendV2Message(client, message.channel.id, await t('remove.ticket_removed', message.guild.id, { id: member.id }), []);
                } catch (e) {
                    return sendV2Message(client, message.channel.id, await t('remove.ticket_error', message.guild.id), []);
                }
             }
        }

        // --- STANDARD CONFIGURATION REMOVE ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('remove.permission', message.guild.id), []);
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'perm' || sub === 'permission') {
            const targetStr = args[1];
            if (!targetStr) {
                return sendV2Message(client, message.channel.id, await t('remove.usage_perm', message.guild.id), []);
            }

            let roleId = null;
            if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
            else {
                const id = targetStr.replace(/[<@&>]/g, '');
                if (message.guild.roles.cache.has(id)) roleId = id;
            }

            if (!roleId) {
                return sendV2Message(client, message.channel.id, await t('remove.role_required', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.customPermissions || config.customPermissions.length === 0) {
                 return sendV2Message(client, message.channel.id, await t('remove.no_perms', message.guild.id), []);
            }

            const initialLength = config.customPermissions.length;
            config.customPermissions = config.customPermissions.filter(p => p.roleId !== roleId);
            const deletedCount = initialLength - config.customPermissions.length;

            if (deletedCount === 0) {
                return sendV2Message(client, message.channel.id, await t('remove.role_no_perms', message.guild.id, { id: roleId }), []);
            }

            await config.save();
            return sendV2Message(client, message.channel.id, await t('remove.perm_success', message.guild.id, { count: deletedCount, id: roleId }), []);
        }

        if (sub === 'activity') {
            try {
                // Remove from DB
                db.prepare('UPDATE guild_settings SET bot_activity_type = NULL, bot_activity_text = NULL, bot_activity_url = NULL WHERE guild_id = ?').run(message.guild.id);
                
                // Clear current activity (if it was this guild's turn, or just to be responsive)
                client.user.setActivity(null);

                return sendV2Message(client, message.channel.id, await t('remove.activity_success', message.guild.id), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('remove.activity_error', message.guild.id, { error: e.message }), []);
            }
        }

        return sendV2Message(client, message.channel.id, await t('remove.usage_activity', message.guild.id), []);
    }
};