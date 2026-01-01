const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');

module.exports = {
    name: 'claim',
    description: 'Prendre en charge un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, "❌ Ce salon n'est pas un ticket actif.", []);
        }

        if (ticket.claimedBy) {
            return sendV2Message(client, message.channel.id, `❌ Ce ticket est déjà pris en charge par <@${ticket.claimedBy}>.`, []);
        }

        ticket.claimedBy = message.author.id;
        await ticket.save();

        // Update topic or just send message
        await sendV2Message(client, message.channel.id, `🙋‍♂️ **Ticket pris en charge par** <@${message.author.id}>.`, []);
        
        // Optionally update channel name or topic
        // await message.channel.setName(`claimed-${message.author.username}`);
    }
};
