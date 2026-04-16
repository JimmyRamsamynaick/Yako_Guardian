const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'say',
    description: 'Fait parler le bot',
    category: 'Utils',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        const rawContent = args.join(' ');
        
        // Determine upload limit based on guild tier
        // Tier 2: 50MB, Tier 3: 100MB, Others: 25MB
        let MAX_SIZE = 25 * 1024 * 1024;
        if (message.guild.premiumTier >= 3) MAX_SIZE = 100 * 1024 * 1024;
        else if (message.guild.premiumTier >= 2) MAX_SIZE = 50 * 1024 * 1024;

        // Safety margin (2MB to be safe against request overhead)
        MAX_SIZE -= 2 * 1024 * 1024;

        let currentTotalSize = 0;
        const validAttachments = [];
        const ignoredAttachments = [];

        if (message.attachments.size > 0) {
            message.attachments.forEach(a => {
                console.log(`[DEBUG] Attachment: ${a.name}, Size: ${a.size}, Max: ${MAX_SIZE}`);
                if (currentTotalSize + a.size <= MAX_SIZE) {
                    validAttachments.push(a);
                    currentTotalSize += a.size;
                } else {
                    ignoredAttachments.push(a.name);
                }
            });
        }

        if (!rawContent && validAttachments.length === 0) {
            if (ignoredAttachments.length > 0) {
                return message.channel.send({ 
                    embeds: [createEmbed('Erreur', `Les fichiers suivants sont trop volumineux pour être envoyés par le bot (Limite : ~${Math.round(MAX_SIZE / 1024 / 1024)}MB) : ${ignoredAttachments.join(', ')}`, 'error')] 
                });
            }
            return message.channel.send({ embeds: [createEmbed(await t('say.usage', message.guild.id), '', 'info')] });
        }

        message.delete().catch(() => {});
        
        const payload = { files: validAttachments };

        if (rawContent) {
            const content = rawContent.replace(/\b\d{17,20}\b/g, (id, offset, source) => {
                const previousChar = source[offset - 1] || '';
                const nextChar = source[offset + id.length] || '';

                if (previousChar === '@' || previousChar === '#' || previousChar === '<' || nextChar === '>') {
                    return id;
                }

                return message.guild.roles.cache.has(id) ? `<@&${id}>` : id;
            });

            let title = '';
            let description = content;

            // Check if content contains a mention
            const hasMention = /<(@(!?|&|#)\d+|#\d+)>/.test(content);

            // Determine if we want a title or just everything in description
            if (content.length <= 256 && !content.includes('\n') && !hasMention) {
                title = content;
                description = '';
            } else {
                const firstNewline = content.indexOf('\n');
                if (firstNewline > -1 && firstNewline <= 256) {
                    const potentialTitle = content.substring(0, firstNewline);
                    // If the potential title has a mention, put everything in description
                    if (/<(@(!?|&|#)\d+|#\d+)>/.test(potentialTitle)) {
                        title = '';
                        description = content;
                    } else {
                        title = potentialTitle;
                        description = content.substring(firstNewline + 1);
                    }
                } else {
                    title = '';
                    description = content;
                }
            }

            const embedOptions = { noIcon: true };
            // Check for image attachment to display inside embed
            const imageAttachment = validAttachments.find(a => a.contentType && a.contentType.startsWith('image/'));
            if (imageAttachment) {
                embedOptions.image = `attachment://${imageAttachment.name}`;
            }

            payload.embeds = [createEmbed(title, description, 'info', embedOptions)];

            // PING LOGIC: Removed top-level content ping, mention only inside embed
        }

        try {
            await message.channel.send(payload);
        } catch (error) {
            console.error('[SAY ERROR]', error.message);
            if (error.code === 40005 || error.status === 413) {
                 message.channel.send({ embeds: [createEmbed('Erreur', 'L\'image est trop lourde pour être envoyée par le bot.', 'error')] }).catch(() => {});
            } else {
                 throw error; // Let global handler handle other errors (but it might print buffer again if not careful)
            }
        }
    }
};
