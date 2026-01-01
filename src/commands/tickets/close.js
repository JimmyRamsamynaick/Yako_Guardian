const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'close',
    description: 'Fermer le ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, "❌ Ce salon n'est pas un ticket actif.", []);
        }

        const reason = args.join(' ') || 'Aucune raison spécifiée';

        // Transcript generation
        let transcript = `TRANSCRIPT DU TICKET\n`;
        transcript += `ID: ${ticket.channelId}\n`;
        transcript += `Créateur: ${ticket.userId}\n`;
        transcript += `Fermé par: ${message.author.tag}\n`;
        transcript += `Raison: ${reason}\n`;
        transcript += `-------------------------\n\n`;

        const messages = await message.channel.messages.fetch({ limit: 100 }); // Simple limit
        messages.reverse().forEach(m => {
            transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });

        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${ticket.channelId}.txt` });

        // Send to transcript channel
        const config = await TicketConfig.findOne({ guildId: message.guild.id });
        if (config && config.transcriptChannelId) {
            const transChannel = message.guild.channels.cache.get(config.transcriptChannelId);
            if (transChannel) {
                await transChannel.send({
                    content: `📕 **Ticket Fermé**\nTicket: ${message.channel.name}\nFermé par: <@${message.author.id}>\nRaison: ${reason}`,
                    files: [attachment]
                });
            }
        }

        // Delete active ticket entry
        await ActiveTicket.deleteOne({ channelId: message.channel.id });

        // Delete channel
        await sendV2Message(client, message.channel.id, "🔒 Fermeture du ticket dans 5 secondes...", []);
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
    }
};
