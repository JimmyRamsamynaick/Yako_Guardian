const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');

module.exports = {
    name: 'rename',
    description: 'Renommer un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, "❌ Ce salon n'est pas un ticket actif.", []);
        }

        const newName = args.join('-');
        if (!newName) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+rename <nouveau-nom>`", []);
        }

        try {
            await message.channel.setName(newName);
            return sendV2Message(client, message.channel.id, `✅ Ticket renommé en **${newName}**.`, []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, "❌ Impossible de renommer le salon (Rate limit ou Permissions).", []);
        }
    }
};
