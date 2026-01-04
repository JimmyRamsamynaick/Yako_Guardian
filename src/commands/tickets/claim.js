const ActiveTicket = require('../../database/models/ActiveTicket');
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

        if (ticket.claimedBy) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_claim.already_claimed', message.guild.id, { user: ticket.claimedBy }), 'error')] });
        }

        ticket.claimedBy = message.author.id;
        await ticket.save();

        // Update topic or just send message
        await message.channel.send({ embeds: [createEmbed('', `${THEME.icons.success} ${await t('ticket_claim.success', message.guild.id, { user: message.author.id })}`, 'success')] });
        
        // Optionally update channel name or topic
        // await message.channel.setName(`claimed-${message.author.username}`);
    }
};
