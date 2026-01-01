const { sendV2Message } = require('../../utils/componentUtils');
const { createTicket } = require('../../utils/modmailUtils');

module.exports = {
    name: 'openmodmail',
    description: 'Ouvrir un ticket Modmail avec un membre',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return sendV2Message(client, message.channel.id, "❌ Permission refusée.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+openmodmail <@membre>`", []);
        }

        try {
            // Use standard createTicket function to ensure DB consistency
            const channel = await createTicket(client, member.user, message.guild, `Ticket ouvert manuellement par le staff ${message.author}`);
            
            // Notify staff in the channel
            await channel.send(`${message.author} a ouvert ce ticket avec ${member}.`);
            
            sendV2Message(client, message.channel.id, `✅ Modmail ouvert : ${channel}`, []);
        } catch (error) {
            sendV2Message(client, message.channel.id, `❌ Erreur : ${error.message}`, []);
        }
    }
};