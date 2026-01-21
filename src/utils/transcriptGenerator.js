const { AttachmentBuilder } = require('discord.js');

/**
 * Generates a premium HTML transcript for a ticket.
 * @param {Array} messages - Array of Discord messages (should be sorted oldest to newest)
 * @param {Object} ticketInfo - Metadata about the ticket (guildName, channelName, ticketId, openerId, closerTag, date, guildIconUrl)
 * @returns {string} - The complete HTML string
 */
function generateTranscript(messages, ticketInfo) {
    const messagesHtml = messages.map(m => {
        const author = m.author;
        const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 64 });
        const date = m.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        let content = m.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");

        // Basic formatting for mentions (visual only, no links)
        content = content.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@User</span>');
        content = content.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#Channel</span>');
        content = content.replace(/&lt;@&(\d+)&gt;/g, '<span class="mention">@Role</span>');

        // Attachments
        let attachmentsHtml = '';
        if (m.attachments.size > 0) {
            m.attachments.forEach(att => {
                const isImage = att.contentType && att.contentType.startsWith('image/');
                if (isImage) {
                    attachmentsHtml += `<div class="attachment"><a href="${att.url}" target="_blank"><img src="${att.url}" alt="Attachment"></a></div>`;
                } else {
                    attachmentsHtml += `<div class="attachment-file"><a href="${att.url}" target="_blank">📄 ${att.name}</a></div>`;
                }
            });
        }

        // Embeds
        let embedsHtml = '';
        if (m.embeds.length > 0) {
            m.embeds.forEach(embed => {
                embedsHtml += `
                <div class="embed" style="border-left-color: ${embed.hexColor || '#2b2d31'};">
                    ${embed.title ? `<div class="embed-title">${embed.title}</div>` : ''}
                    ${embed.description ? `<div class="embed-desc">${embed.description.replace(/\n/g, '<br>')}</div>` : ''}
                    ${embed.fields.length > 0 ? `<div class="embed-fields">
                        ${embed.fields.map(f => `<div class="embed-field"><span class="field-name">${f.name}</span><br><span class="field-value">${f.value}</span></div>`).join('')}
                    </div>` : ''}
                    ${embed.image ? `<div class="embed-image"><img src="${embed.image.url}"></div>` : ''}
                    ${embed.footer ? `<div class="embed-footer">${embed.footer.text}</div>` : ''}
                </div>`;
            });
        }

        // Bot Tag
        const botTagHtml = author.bot ? `<span class="bot-tag">BOT</span>` : '';

        return `
        <div class="message">
            <div class="avatar"><img src="${avatarUrl}" alt="Avatar"></div>
            <div class="message-content">
                <div class="header">
                    <span class="username" style="color: ${m.member?.displayHexColor !== '#000000' ? m.member?.displayHexColor : '#ffffff'}">${author.username}</span>
                    ${botTagHtml}
                    <span class="timestamp">${date}</span>
                </div>
                <div class="content">
                    ${content}
                    ${attachmentsHtml}
                    ${embedsHtml}
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Fallback icon if no guild icon
    const guildIcon = ticketInfo.guildIconUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${ticketInfo.channelName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        
        /* Reset & Base */
        * { box-sizing: border-box; }
        body {
            background-color: #313338;
            color: #dbdee1;
            font-family: 'gg sans', 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 16px;
            line-height: 1.375rem;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; background-color: #2b2d31; }
        ::-webkit-scrollbar-thumb { background-color: #1a1b1e; border-radius: 4px; }
        ::-webkit-scrollbar-track { background-color: #2b2d31; }

        /* Hint Bar */
        .hint-bar {
            background-color: #e0e1e5;
            color: #060607;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        /* Top Info Bar (#infos) */
        #infos {
            display: flex;
            align-items: center;
            height: 48px;
            padding: 0 16px;
            background-color: #2b2d31;
            box-shadow: 0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05);
            z-index: 2;
            flex-shrink: 0;
            color: #ffffff;
            font-weight: 600;
        }

        .guild-icon {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            margin-right: 10px;
            object-fit: cover;
        }

        .divider {
            margin: 0 10px;
            color: #4e5058;
        }

        .channel-icon {
            margin-right: 5px;
            color: #80848e;
            display: flex;
            align-items: center;
        }

        /* Chat Container (#channel) */
        #channel {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px 0 30px 0;
            display: flex;
            flex-direction: column;
        }

        /* Messages */
        .message {
            display: flex;
            padding: 2px 16px;
            margin-top: 17px;
            min-height: 44px; /* Ensure avatar fits */
            position: relative;
        }
        
        .message:hover {
            background-color: rgba(4, 4, 5, 0.07);
        }

        .avatar {
            width: 40px;
            height: 40px;
            margin-right: 16px;
            margin-top: 2px;
            flex-shrink: 0;
            cursor: pointer;
        }

        .avatar img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .message-content {
            flex: 1;
            min-width: 0;
        }

        .header {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            line-height: 22px;
            margin-bottom: 2px;
        }

        .username {
            font-size: 16px;
            font-weight: 500;
            color: #f2f3f5;
            margin-right: 6px;
            cursor: pointer;
        }
        
        .username:hover {
            text-decoration: underline;
        }

        .bot-tag {
            background-color: #5865f2;
            color: #fff;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;
            text-transform: uppercase;
            font-weight: bold;
            margin-right: 6px;
            display: flex;
            align-items: center;
            height: 15px;
            line-height: 1;
        }

        .timestamp {
            font-size: 12px;
            color: #949ba4;
            font-weight: 500;
            margin-left: 0.25rem;
        }

        .content {
            font-size: 16px;
            line-height: 1.375rem;
            color: #dbdee1;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .mention {
            background-color: rgba(88, 101, 242, 0.3);
            color: #dee0fc;
            padding: 0 2px;
            border-radius: 3px;
            font-weight: 500;
            cursor: pointer;
        }
        
        .mention:hover {
            background-color: rgba(88, 101, 242, 0.6);
            color: #ffffff;
        }

        /* Attachments */
        .attachment {
            margin-top: 8px;
        }
        
        .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .attachment-file {
            background-color: #2b2d31;
            border: 1px solid #1f2023;
            border-radius: 3px;
            padding: 10px;
            margin-top: 8px;
            display: inline-flex;
            align-items: center;
            max-width: 100%;
        }
        
        .attachment-file a {
            color: #00b0f4;
            text-decoration: none;
            font-weight: 500;
        }
        
        .attachment-file a:hover {
            text-decoration: underline;
        }

        /* Embeds */
        .embed {
            background-color: #2b2d31;
            border-left: 4px solid;
            border-radius: 4px;
            padding: 8px 16px 16px;
            margin-top: 8px;
            max-width: 520px;
            display: grid;
            grid-template-columns: auto;
            grid-template-rows: auto;
        }

        .embed-title {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
            font-size: 16px;
        }

        .embed-desc {
            font-size: 14px;
            color: #dbdee1;
            line-height: 1.375rem;
        }
        
        .embed-fields {
             margin-top: 8px;
             display: grid;
             gap: 8px;
        }
        
        .embed-field {
            font-size: 14px;
        }
        
        .field-name {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 2px;
        }
        
        .field-value {
            color: #dbdee1;
            white-space: pre-wrap;
        }

        .embed-image img {
            max-width: 100%;
            border-radius: 4px;
            margin-top: 10px;
        }
        
        .embed-footer {
            font-size: 12px;
            color: #949ba4;
            margin-top: 8px;
            font-weight: 500;
        }

    </style>
</head>
<body>
    <div class="hint-bar">
        <span>💡</span>
        Astuce : Téléchargez et ouvrez ce fichier dans le navigateur pour afficher les messages !
    </div>

    <div id="infos">
        <img src="${guildIcon}" alt="Guild Icon" class="guild-icon">
        <span>${ticketInfo.guildName}</span>
        <span class="divider">/</span>
        <div class="channel-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path fill-rule="evenodd" clip-rule="evenodd" d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 15H15.41L16.47 9H10.47L9.41001 15Z" fill="currentColor"/>
            </svg>
        </div>
        <span>${ticketInfo.channelName}</span>
        <span class="divider">|</span>
        <span style="font-weight: 400; color: #949ba4; font-size: 14px;">Ticket ID: ${ticketInfo.ticketId}</span>
    </div>

    <div id="channel">
        <div class="message-group" style="margin-top: 20px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #f2f3f5;">Bienvenue dans #${ticketInfo.channelName} !</div>
            <div style="font-size: 16px; color: #b5bac1; margin-top: 8px;">
                Ceci est le début de l'historique du ticket de <span style="font-weight: 600; color: #f2f3f5;">${ticketInfo.openerId}</span>.
            </div>
        </div>

        ${messagesHtml}
        
        <div class="message" style="justify-content: center; opacity: 0.6; margin-top: 30px; margin-bottom: 20px;">
            <div class="content" style="text-align: center; font-size: 14px;">
                Fin du transcript • Généré par Yako Guardian • ${ticketInfo.date}
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

module.exports = { generateTranscript };