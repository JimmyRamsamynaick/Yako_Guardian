const { createEmbed } = require('../../utils/design');
const { parseEmoji, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'emoji',
    description: 'Récupère l’image d’un émoji et l\'ajoute au serveur si possible',
    category: 'Utils',
    async run(client, message, args) {
        const hasPermission = message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
        let content = args.join(' ');

        if (message.reference) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (repliedMessage && repliedMessage.content) {
                    content += ' ' + repliedMessage.content;
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du message répondu:', error);
            }
        }

        const customEmojiRegex = /<(a?):(\w+):(\d+)>/g;
        const matches = [...content.matchAll(customEmojiRegex)];

        if (matches.length === 0) {
            if (!args[0] && !message.reference) {
                return message.channel.send({ embeds: [createEmbed(await t('emoji.usage', message.guild.id), '', 'info')] });
            }
            return message.channel.send({ embeds: [createEmbed(await t('emoji.invalid', message.guild.id), '', 'error')] });
        }

        // Déduplication par ID et vérification des émojis existants
        const uniqueEmojis = [];
        const seenIds = new Set();
        const guildEmojis = message.guild.emojis.cache;

        for (const match of matches) {
            const isAnimated = match[1] === 'a';
            const name = match[2];
            const id = match[3];

            if (!seenIds.has(id)) {
                seenIds.add(id);
                
                // Si l'émoji est déjà présent sur le serveur, on l'ignore (pas besoin de l'ajouter à nouveau)
                if (guildEmojis.has(id)) continue;
                
                uniqueEmojis.push({ name, id, animated: isAnimated });
            }
        }

        if (uniqueEmojis.length === 0 && matches.length > 0) {
            return message.channel.send({ embeds: [createEmbed('Information', 'Tous les émojis détectés sont déjà présents sur ce serveur.', 'info')] });
        }

        const embeds = [];
        const results = [];

        for (const emojiData of uniqueEmojis) {
            const { name, id, animated } = emojiData;
            const extension = animated ? 'gif' : 'png';
            const url = `https://cdn.discordapp.com/emojis/${id}.${extension}?size=4096`;

            if (hasPermission) {
                try {
                    const newEmoji = await message.guild.emojis.create({ attachment: url, name: name });
                    results.push(await t('create.success', message.guild.id, { emoji: newEmoji }));
                } catch (error) {
                    console.error(error);
                    results.push(await t('create.error', message.guild.id, { error: `${name}: ${error.message.replace('DiscordAPIError[50035]: ', '')}` }));
                }
            } else {
                results.push(await t('emoji.success', message.guild.id, { name: name, url: url }));
            }
        }

        if (results.length > 0) {
            const mainEmbed = createEmbed(hasPermission ? 'Résultat de l\'ajout d\'émojis' : 'Informations Émojis', results.join('\n'), 'success');
            
            // Si on n'en a qu'un seul, on peut mettre l'image dans l'embed comme avant
            if (uniqueEmojis.length === 1) {
                const { id, animated } = uniqueEmojis[0];
                const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=4096`;
                mainEmbed.setImage(url);
            }
            
            return message.channel.send({ embeds: [mainEmbed] });
        }
    }
};
