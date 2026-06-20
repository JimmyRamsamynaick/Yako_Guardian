const { createEmbed } = require('../../utils/design');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'sticker',
    description: 'sticker.description',
    category: 'Utils',
    permLevel: 0,
    usage: 'sticker.usage',
    async run(client, message, args) {
        const hasPermission = message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
        let content = args.join(' ');

        if (message.reference) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (repliedMessage && repliedMessage.stickers.size > 0) {
                    // If the replied message has stickers, use those
                    for (const sticker of repliedMessage.stickers.values()) {
                        content += ` sticker:${sticker.id}`;
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du message répondu:', error);
            }
        }

        // Regex to match sticker IDs or sticker URLs
        const stickerIdRegex = /sticker:(\d+)/g;
        const matches = [...content.matchAll(stickerIdRegex)];
        
        // Also check for any sticker IDs mentioned in args
        for (const arg of args) {
            if (/^\d+$/.test(arg)) {
                matches.push([arg, arg]);
            }
        }

        if (matches.length === 0 && (!message.reference || (message.reference && (await message.channel.messages.fetch(message.reference.messageId)).stickers.size === 0))) {
            if (!args[0] && !message.reference) {
                return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('sticker.usage', message.guild.id), 'info')] });
            }
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('sticker.invalid', message.guild.id), 'error')] });
        }

        // Deduplication by ID and check for existing stickers
        const uniqueStickers = [];
        const seenIds = new Set();
        const guildStickers = message.guild.stickers.cache;

        for (const match of matches) {
            const id = match[1];
            if (!seenIds.has(id)) {
                seenIds.add(id);
                
                // If sticker is already present on the server, skip it
                if (guildStickers.has(id)) continue;
                
                try {
                    // Fetch the sticker to get details
                    const sticker = await client.fetchSticker(id);
                    uniqueStickers.push(sticker);
                } catch (e) {
                    console.error('Erreur lors de la récupération de l\'autocollant:', e);
                }
            }
        }

        if (uniqueStickers.length === 0 && matches.length > 0) {
            return message.channel.send({ embeds: [createEmbed(await t('common.info_title', message.guild.id), await t('sticker.all_present', message.guild.id), 'info')] });
        }

        const results = [];

        for (const sticker of uniqueStickers) {
            const url = sticker.url;

            if (hasPermission) {
                try {
                    const tags = Array.isArray(sticker.tags) 
                        ? sticker.tags.join(',') 
                        : (typeof sticker.tags === 'string' ? sticker.tags : 'yako');
                    
                    const newSticker = await message.guild.stickers.create({
                        file: url,
                        name: sticker.name,
                        description: sticker.description || await t('sticker.default_description', message.guild.id),
                        tags: tags
                    });
                    results.push(await t('sticker.create.success', message.guild.id, { sticker: newSticker.name }));
                } catch (error) {
                    console.error(error);
                    results.push(await t('sticker.create.error', message.guild.id, { sticker: sticker.name, error: error.message }));
                }
            } else {
                results.push(await t('sticker.success', message.guild.id, { name: sticker.name, url: url }));
            }
        }

        if (results.length > 0) {
            const mainEmbed = createEmbed(hasPermission ? await t('sticker.result_title.add', message.guild.id) : await t('sticker.result_title.info', message.guild.id), results.join('\n'), 'success');
            
            if (uniqueStickers.length === 1) {
                mainEmbed.setImage(uniqueStickers[0].url);
            }
            
            return message.channel.send({ embeds: [mainEmbed] });
        }
    }
};