const { AttachmentBuilder } = require('discord.js');

/**
 * Generates a premium HTML transcript for a ticket.
 * @param {Array} messages - Array of Discord messages (should be sorted oldest to newest)
 * @param {Object} ticketInfo - Metadata about the ticket (guildName, channelName, ticketId, openerId, closerTag, date)
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

        // Embeds (simplified rendering)
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

        return `
        <div class="message-group">
            <div class="avatar"><img src="${avatarUrl}" alt="Avatar"></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="username" style="color: ${m.member?.displayHexColor !== '#000000' ? m.member?.displayHexColor : '#ffffff'}">${author.username}</span>
                    <span class="timestamp">${date}</span>
                </div>
                <div class="message-body">
                    ${content}
                    ${attachmentsHtml}
                    ${embedsHtml}
                </div>
            </div>
        </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${ticketInfo.channelName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        
        body {
            background-color: #313338;
            color: #dbdee1;
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .header {
            background-color: #2b2d31;
            padding: 15px 20px;
            border-bottom: 1px solid #1f2023;
            box-shadow: 0 1px 3px rgba(0,0,0,0.5);
            flex-shrink: 0;
        }

        .header h1 {
            margin: 0;
            font-size: 20px;
            color: #f2f3f5;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-info {
            margin-top: 5px;
            font-size: 14px;
            color: #949ba4;
        }

        .chat-container {
            flex-grow: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .chat-container::-webkit-scrollbar {
            width: 8px;
            background-color: #2b2d31;
        }

        .chat-container::-webkit-scrollbar-thumb {
            background-color: #1a1b1e;
            border-radius: 4px;
        }

        .message-group {
            display: flex;
            margin-bottom: 5px;
            padding: 2px 0;
        }

        .message-group:hover {
            background-color: rgba(0, 0, 0, 0.04);
        }

        .avatar {
            width: 50px;
            margin-right: 15px;
            flex-shrink: 0;
        }

        .avatar img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }

        .message-content {
            flex-grow: 1;
            max-width: 90%;
        }

        .message-header {
            display: flex;
            align-items: baseline;
            margin-bottom: 2px;
        }

        .username {
            font-weight: 500;
            font-size: 16px;
            margin-right: 8px;
        }

        .timestamp {
            font-size: 12px;
            color: #949ba4;
        }

        .message-body {
            font-size: 15px;
            line-height: 1.4;
            color: #dbdee1;
            white-space: pre-wrap;
        }

        .mention {
            background-color: rgba(88, 101, 242, 0.3);
            color: #dee0fc;
            padding: 0 2px;
            border-radius: 3px;
            font-weight: 500;
        }

        .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 5px;
            margin-top: 5px;
            cursor: pointer;
        }

        .attachment-file {
            background-color: #2b2d31;
            padding: 10px;
            border-radius: 5px;
            margin-top: 5px;
            display: inline-block;
            border: 1px solid #1f2023;
        }

        .attachment-file a {
            color: #00b0f4;
            text-decoration: none;
        }

        /* Embed Styles */
        .embed {
            background-color: #2b2d31;
            border-left: 4px solid;
            border-radius: 4px;
            padding: 10px;
            margin-top: 5px;
            max-width: 500px;
        }

        .embed-title {
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 5px;
        }

        .embed-desc {
            font-size: 14px;
            color: #dbdee1;
        }
        
        .embed-fields {
             margin-top: 8px;
             display: grid;
             gap: 8px;
        }
        
        .embed-field {
            font-size: 13px;
        }
        
        .field-name {
            font-weight: bold;
            color: #f2f3f5;
        }

        .embed-image img {
            max-width: 100%;
            border-radius: 4px;
            margin-top: 10px;
        }
        
        .embed-footer {
            font-size: 12px;
            color: #949ba4;
            margin-top: 5px;
        }

    </style>
</head>
<body>
    <div class="header">
        <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#dbdee1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 3V21" stroke="#dbdee1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${ticketInfo.channelName}
        </h1>
        <div class="header-info">
            Server: ${ticketInfo.guildName} | Ticket ID: ${ticketInfo.ticketId} | Created by: <span class="mention">@${ticketInfo.openerId}</span> | Closed by: ${ticketInfo.closerTag} | Date: ${ticketInfo.date}
        </div>
    </div>
    <div class="chat-container">
        ${messagesHtml}
        
        <div class="message-group" style="margin-top: 20px; justify-content: center; opacity: 0.7;">
            <div class="message-content" style="text-align: center;">
                <span class="timestamp">End of transcript generated by Yako Guardian</span>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

module.exports = { generateTranscript };