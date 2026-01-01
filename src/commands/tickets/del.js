const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');

module.exports = {
    name: 'del',
    aliases: ['remove'],
    description: 'Retirer un membre du ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, "❌ Cette commande n'est disponible que dans un ticket.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+del <@membre>`", []);
        }

        // Prevent removing the ticket creator or staff (optional but good practice)
        // For now, just remove permission.

        try {
            await message.channel.permissionOverwrites.delete(member);
            // Or explicitly deny
            // await message.channel.permissionOverwrites.edit(member, { ViewChannel: false });
            
            return sendV2Message(client, message.channel.id, `✅ <@${member.id}> a été retiré du ticket.`, []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, "❌ Impossible de retirer le membre.", []);
        }
    }
};
