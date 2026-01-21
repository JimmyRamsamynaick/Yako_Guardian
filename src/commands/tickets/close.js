const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');
const { AttachmentBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { generateTranscript } = require('../../utils/transcriptGenerator');

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

        // Fetch All messages
        let messages = [];
        let lastId;
        
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const fetched = await message.channel.messages.fetch(options);
            if (fetched.size === 0) break;

            messages.push(...Array.from(fetched.values()));
            lastId = fetched.last().id;

            if (fetched.size !== 100) break;
        }
        
        messages = messages.reverse(); // Oldest first

        // Prepare Metadata
        const ticketInfo = {
            guildName: message.guild.name,
            channelName: message.channel.name,
            ticketId: ticket.channelId,
            openerId: ticket.userId,
            closerTag: message.author.tag,
            date: new Date().toLocaleString('fr-FR')
        };

        // Generate HTML
        const htmlContent = generateTranscript(messages, ticketInfo);
        
        const attachment = new AttachmentBuilder(Buffer.from(htmlContent, 'utf-8'), { name: `transcript-${ticket.channelId}.html` });

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
