const ActiveTicket = require('../../database/models/ActiveTicket');
const TicketConfig = require('../../database/models/TicketConfig');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
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

        // Fetch User for details
        const openerUser = await client.users.fetch(ticket.userId).catch(() => null);

        // Generate Filename: User-DDMMYYYY.html
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}${month}${year}`;
        
        const safeUsername = (openerUser ? openerUser.username : `user-${ticket.userId}`).replace(/[^a-zA-Z0-9-_]/g, '');
        const fileName = `${safeUsername}-${dateStr}.html`;

        // Generate Transcript
        const attachment = await generateTranscript(message.channel, fileName);

        // Send to transcript channel
        const config = await TicketConfig.findOne({ guildId: message.guild.id });
        if (config && config.transcriptChannelId) {
            try {
                // Clean ID just in case it was stored with <#>
                const transChannelId = config.transcriptChannelId.replace(/[<#>]/g, '');
                const transChannel = await message.guild.channels.fetch(transChannelId).catch(() => null);
                
                if (transChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(await t('ticket_close.log_title', message.guild.id) || 'Ticket Fermé')
                        .setColor('#f04747')
                        .addFields(
                            { name: '🎫 Ticket', value: message.channel.name, inline: true },
                            { name: '👤 Ouvert par', value: `<@${ticket.userId}>`, inline: true },
                            { name: '🔒 Fermé par', value: `<@${message.author.id}>`, inline: true },
                            { name: '📝 Raison', value: reason, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() });

                    await transChannel.send({
                        embeds: [logEmbed],
                        files: [attachment]
                    });
                }
            } catch (e) {
                console.error("Error sending transcript:", e);
            }
        }

        // Notify user if it's a modmail ticket or if we want to notify regular ticket users too
        if (openerUser) {
            // Using modmail.ticket_closed_dm as a generic closed message or we can create a specific one
            openerUser.send(await t('modmail.ticket_closed_dm', message.guild.id, { server: message.guild.name })).catch(() => {});
        }

        // Delete active ticket entry
        await ActiveTicket.deleteOne({ channelId: message.channel.id });

        // Delete channel
        await message.channel.send({ embeds: [createEmbed(await t('ticket_close.closing', message.guild.id), '', 'success')] });
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
    }
};
