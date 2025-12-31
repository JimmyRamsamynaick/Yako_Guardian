const { sendV2Message } = require('../../utils/componentUtils');
const { parseEmoji } = require('discord.js');

module.exports = {
    name: 'create',
    description: 'Ajouter un émoji au serveur',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageEmojisAndStickers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les émojis` requise.", []);
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
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+create <url/emoji> <nom>` ou attachez une image avec `+create <nom>`", []);
        }

        try {
            const newEmoji = await message.guild.emojis.create({ attachment: url, name: name });
            sendV2Message(client, message.channel.id, `✅ Émoji créé : ${newEmoji}`, []);
        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, `❌ Erreur : ${error.message.replace('DiscordAPIError[50035]: ', '')}`, []);
        }
    }
};