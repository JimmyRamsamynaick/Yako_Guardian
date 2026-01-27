const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'say',
    description: 'Fait parler le bot',
    category: 'Utils',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        const content = args.join(' ');
        
        // Determine upload limit based on guild tier
        // Tier 2: 50MB, Tier 3: 100MB, Others: 25MB
        let MAX_SIZE = 25 * 1024 * 1024;
        if (message.guild.premiumTier >= 3) MAX_SIZE = 100 * 1024 * 1024;
        else if (message.guild.premiumTier >= 2) MAX_SIZE = 50 * 1024 * 1024;

        // Safety margin (1MB)
        MAX_SIZE -= 1024 * 1024;

        let currentTotalSize = 0;
        const validAttachments = [];
        const ignoredAttachments = [];

        if (message.attachments.size > 0) {
            message.attachments.forEach(a => {
                if (currentTotalSize + a.size <= MAX_SIZE) {
                    validAttachments.push(a);
                    currentTotalSize += a.size;
                } else {
                    ignoredAttachments.push(a.name);
                }
            });
        }

        if (!content && validAttachments.length === 0) {
            if (ignoredAttachments.length > 0) {
                return message.channel.send({ 
                    embeds: [createEmbed('Erreur', `Les fichiers suivants sont trop volumineux pour être envoyés (Limite serveur : ~${Math.round(MAX_SIZE / 1024 / 1024)}MB) : ${ignoredAttachments.join(', ')}`, 'error')] 
                });
            }
            return message.channel.send({ embeds: [createEmbed(await t('say.usage', message.guild.id), '', 'info')] });
        }

        message.delete().catch(() => {});
        
        const payload = { files: validAttachments };

        if (content) {
            let title = content;
            let description = '';

            // Discord Limit: Title max 256 chars
            if (content.length > 256) {
                const firstNewline = content.indexOf('\n');
                if (firstNewline > -1 && firstNewline <= 256) {
                    title = content.substring(0, firstNewline);
                    description = content.substring(firstNewline + 1);
                } else {
                    title = ' '; // Use space to keep the icon
                    description = content;
                }
            }

            // Format Title to replace raw mentions with display names
            const formatTitle = (text) => {
                if (!text) return text;
                
                // Roles
                text = text.replace(/<@&(\d+)>/g, (match, id) => {
                    const role = message.guild.roles.cache.get(id);
                    return role ? `@${role.name}` : match;
                });
                
                // Users
                text = text.replace(/<@!?(\d+)>/g, (match, id) => {
                    const user = message.mentions.users.get(id) || message.guild.members.cache.get(id)?.user || client.users.cache.get(id);
                    return user ? `@${user.username}` : match;
                });

                // Channels
                text = text.replace(/<#(\d+)>/g, (match, id) => {
                    const channel = message.guild.channels.cache.get(id);
                    return channel ? `#${channel.name}` : match;
                });
                
                return text;
            };

            title = formatTitle(title);

            const embedOptions = {};
            // Check for image attachment to display inside embed
            const imageAttachment = validAttachments.find(a => a.contentType && a.contentType.startsWith('image/'));
            if (imageAttachment) {
                embedOptions.image = `attachment://${imageAttachment.name}`;
            }

            payload.embeds = [createEmbed(title, description, 'info', embedOptions)];
        }

        await message.channel.send(payload);
    }
};
