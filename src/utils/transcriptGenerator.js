const discordTranscripts = require('discord-html-transcripts');
const { AttachmentBuilder } = require('discord.js');

/**
 * Generates a transcript for a channel using discord-html-transcripts.
 * @param {Object} channel - The Discord channel object
 * @param {string} fileName - The desired filename
 * @returns {Promise<Object>} - The attachment object
 */
async function generateTranscript(channel, fileName) {
    // 1. Fetch all messages for the Text Transcript
    let messages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        messages.push(...Array.from(fetched.values()));
        lastId = fetched.last().id;

        if (fetched.size !== 100) break;
    }

    messages = messages.reverse(); // Oldest first

    // 2. Generate Text Transcript (DraftBot Style)
    const ticketInfo = {
        guildName: channel.guild.name,
        channelName: channel.name,
        date: new Date().toLocaleString('fr-FR'),
    };

    let textTranscript = '';
    textTranscript += `Envoyé     : ${ticketInfo.date}\n`;
    textTranscript += `Sauvegardé : ${ticketInfo.date}\n`;
    textTranscript += `Salon      : ${ticketInfo.channelName}\n`;
    textTranscript += `Serveur    : ${ticketInfo.guildName}\n`;
    textTranscript += `\n`;

    messages.forEach(m => {
        const date = m.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const authorName = m.author.username;
        const botTag = m.author.bot ? ' [BOT]' : '';
        
        textTranscript += `[${authorName}]${botTag} : ${date}\n`;
        
        if (m.content) {
            textTranscript += `${m.content}\n`;
        }
        
        if (m.attachments.size > 0) {
            m.attachments.forEach(att => {
                textTranscript += `(Fichier : ${att.name} - ${att.url})\n`;
            });
        }
        
        if (m.embeds.length > 0) {
            m.embeds.forEach(embed => {
                textTranscript += `(Embed : ${embed.title || 'Sans titre'})\n`;
                if (embed.description) textTranscript += `> ${embed.description.replace(/\n/g, '\n> ')}\n`;
                if (embed.fields && embed.fields.length > 0) {
                    embed.fields.forEach(field => {
                        textTranscript += `> [${field.name}] : ${field.value}\n`;
                    });
                }
            });
        }
        
        textTranscript += `\n`;
    });

    // Escape potential comment closers in text transcript
    textTranscript = textTranscript.replace(/-->/g, '-- >');

    // 3. Generate HTML Transcript using the library
    // We use returnType: 'string' to get the HTML code
    const htmlTranscript = await discordTranscripts.createTranscript(channel, {
        limit: -1, 
        returnType: 'string', 
        filename: fileName || 'transcript.html',
        saveImages: true, 
        poweredBy: false,
        footerText: "Exported {number} message{s}", 
    });

    // 4. Combine Text + HTML
    // Wrap text in HTML comments to hide it from the browser view
    const finalContent = `<!--\n${textTranscript}\n-->\n${htmlTranscript}`;

    // 5. Create Attachment
    const attachment = new AttachmentBuilder(Buffer.from(finalContent, 'utf-8'), { 
        name: fileName || 'transcript.html' 
    });

    return attachment;
}

module.exports = { generateTranscript };
