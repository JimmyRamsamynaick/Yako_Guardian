const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'add',
    description: 'Ajouter un membre au ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, "❌ Cette commande n'est disponible que dans un ticket.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+add <@membre>`", []);
        }

        try {
            await message.channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            return sendV2Message(client, message.channel.id, `✅ <@${member.id}> a été ajouté au ticket.`, []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, "❌ Impossible d'ajouter le membre.", []);
        }
    }
};
