const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');
const { AttachmentBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'close',
    description: 'Fermer le ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_close.not_ticket', message.guild.id), '', 'error')] });
        }

        const reason = args.join(' ') || await t('ticket_close.default_reason', message.guild.id);

        // Transcript generation
        let transcript = (await t('ticket_close.transcript_title', message.guild.id)) + "\n";
        transcript += (await t('ticket_close.transcript_id', message.guild.id, { id: ticket.channelId })) + "\n";
        transcript += (await t('ticket_close.transcript_creator', message.guild.id, { user: ticket.userId })) + "\n";
        transcript += (await t('ticket_close.transcript_closed_by', message.guild.id, { user: message.author.tag })) + "\n";
        transcript += (await t('ticket_close.transcript_reason', message.guild.id, { reason: reason })) + "\n";
        transcript += `-------------------------\n\n`;

        const messages = await message.channel.messages.fetch({ limit: 100 }); // Simple limit
        messages.reverse().forEach(m => {
            transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });

        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${ticket.channelId}.txt` });

        // Send to transcript channel
        const config = await TicketConfig.findOne({ guildId: message.guild.id });
        if (config && config.transcriptChannelId) {
            try {
                // Clean ID just in case it was stored with <#>
                const transChannelId = config.transcriptChannelId.replace(/[<#>]/g, '');
                const transChannel = await message.guild.channels.fetch(transChannelId).catch(() => null);
                
                if (transChannel) {
                    await transChannel.send({
                        content: (await t('ticket_close.log_title', message.guild.id)) + `\n` +
                                 (await t('ticket_close.log_ticket', message.guild.id, { name: message.channel.name })) + `\n` +
                                 (await t('ticket_close.log_closed_by', message.guild.id, { user: `<@${message.author.id}>` })) + `\n` +
                                 (await t('ticket_close.log_reason', message.guild.id, { reason: reason })),
                        files: [attachment]
                    });
                }
            } catch (e) {
                console.error("Error sending transcript:", e);
            }
        }

        // Notify user if it's a modmail ticket or if we want to notify regular ticket users too
        const user = await client.users.fetch(ticket.userId).catch(() => null);
        if (user) {
            // Using modmail.ticket_closed_dm as a generic closed message or we can create a specific one
            user.send(await t('modmail.ticket_closed_dm', message.guild.id, { server: message.guild.name })).catch(() => {});
        }

        // Delete active ticket entry
        await ActiveTicket.deleteOne({ channelId: message.channel.id });

        // Delete channel
        await message.channel.send({ embeds: [createEmbed(await t('ticket_close.closing', message.guild.id), '', 'success')] });
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
    }
};
