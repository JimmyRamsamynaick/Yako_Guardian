const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'claim',
    description: 'Prendre en charge un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, await t('ticket_claim.not_ticket', message.guild.id), []);
        }

        if (ticket.claimedBy) {
            return sendV2Message(client, message.channel.id, await t('ticket_claim.already_claimed', message.guild.id, { user: ticket.claimedBy }), []);
        }

        ticket.claimedBy = message.author.id;
        await ticket.save();

        // Update topic or just send message
        await sendV2Message(client, message.channel.id, await t('ticket_claim.success', message.guild.id, { user: message.author.id }), []);
        
        // Optionally update channel name or topic
        // await message.channel.setName(`claimed-${message.author.username}`);
    }
};
