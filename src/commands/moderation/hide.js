const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');

module.exports = {
    name: 'hide',
    description: 'hide.description',
    category: 'Moderation',
    usage: 'hide.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.hide_success_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.hide_loading', message.guild.id)}`, 'loading')] });

        try {
            // Check if ticket
            const ticket = await ActiveTicket.findOne({ channelId: channel.id });
            if (ticket) {
                const config = await TicketConfig.findOne({ guildId: message.guild.id });
                
                // Isolation Logic for Ticket
                const overwrites = [
                    {
                        id: message.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: ticket.userId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
                    },
                    {
                        id: message.author.id, // Hider
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                    }
                ];

                // Keep claimer if exists and different
                if (ticket.claimedBy && ticket.claimedBy !== message.author.id) {
                    overwrites.push({
                        id: ticket.claimedBy,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                    });
                }

                // Deny all configured staff roles
                const allStaffRoles = new Set(config.staffRoles || []);
                if (config.categories) {
                    config.categories.forEach(cat => {
                        if (cat.staffRoles) cat.staffRoles.forEach(r => allStaffRoles.add(r));
                    });
                }

                allStaffRoles.forEach(roleId => {
                    overwrites.push({
                        id: roleId,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    });
                });

                await channel.permissionOverwrites.set(overwrites);
            } else {
                // Standard Hide
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    ViewChannel: false
                });
            }

            await replyMsg.edit({ embeds: [createEmbed(
                await t('moderation.hide_success_title', message.guild.id),
                `${THEME.icons.success} ${await t('moderation.hide_success_desc', message.guild.id, { channel: channel.id })}`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.hide_error', message.guild.id), 'error')] });
        }
    }
};
