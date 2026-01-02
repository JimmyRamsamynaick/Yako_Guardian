const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'create',
    description: 'Ajouter un émoji au serveur',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageEmojisAndStickers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('create.permission', message.guild.id), '', 'error')] });
        }

        let url;
        let name = args[1];

        // Check for attachment
        if (message.attachments.size > 0) {
            url = message.attachments.first().url;
            name = args[0];
        } else if (args[0]) {
            // Check if it's a custom emoji
            const emoji = parseEmoji(args[0]);
            if (emoji && emoji.id) {
                url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
                if (!name) name = emoji.name;
            } else {
                // Assume URL
                url = args[0];
            }
        }

        if (!url || !name) {
            return message.channel.send({ embeds: [createEmbed(await t('create.usage', message.guild.id), '', 'info')] });
        }

        try {
            const newEmoji = await message.guild.emojis.create({ attachment: url, name: name });
            message.channel.send({ embeds: [createEmbed(await t('create.success', message.guild.id, { emoji: newEmoji }), '', 'success')] });
        } catch (error) {
            console.error(error);
            message.channel.send({ embeds: [createEmbed(await t('create.error', message.guild.id, { error: error.message.replace('DiscordAPIError[50035]: ', '') }), '', 'error')] });
        }
    }
};