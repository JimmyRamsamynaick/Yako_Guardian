const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'claim',
    description: 'Prendre en charge un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_claim.not_ticket', message.guild.id), 'error')] });
        }

        const config = await TicketConfig.findOne({ guildId: message.guild.id });

        // Optional: Check if user is staff/admin?
        // Assuming command permissions are handled or we trust the user for now, but to be safe:
        // const isStaff = config && config.staffRoles && config.staffRoles.some(r => message.member.roles.cache.has(r));
        // if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isStaff) ... 
        // I will stick to the requested change: Visibility.

        if (ticket.claimedBy) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_claim.already_claimed', message.guild.id, { user: ticket.claimedBy }), 'error')] });
        }

        ticket.claimedBy = message.author.id;
        await ticket.save();

        // Isolation Logic
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
                id: message.author.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
            }
        ];

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

        await message.channel.permissionOverwrites.set(overwrites);

        // Update topic or just send message
        await message.channel.send({ embeds: [createEmbed('', `${THEME.icons.success} ${await t('ticket_claim.success', message.guild.id, { user: message.author.id })}`, 'success')] });
        
        // Optionally update channel name or topic
        // await message.channel.setName(`claimed-${message.author.username}`);
    }
};
