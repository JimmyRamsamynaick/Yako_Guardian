const { PermissionsBitField } = require('discord.js');
const TicketConfig = require('../../database/models/TicketConfig');
const { updateTicketDashboard } = require('../../handlers/ticketHandler');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'ticket',
    description: 'Gère le système de tickets',
    category: 'Tickets',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('ticket.permission', message.guild.id), null, 'error')] });
            }
            
            let config = await TicketConfig.findOne({ guildId: message.guild.id });
            if (!config) config = await TicketConfig.create({ guildId: message.guild.id });

            // Send Dashboard
            // We use a simplified mock or just pass necessary info to updateTicketDashboard
            const mockInteraction = {
                channelId: message.channel.id,
                channel: message.channel,
                guild: message.guild
            };
            
            await updateTicketDashboard(client, mockInteraction, config);
        } else {
             return message.channel.send({ embeds: [createEmbed(await t('ticket.usage', message.guild.id), null, 'info')] });
        }
    }
};
