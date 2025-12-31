const { sendV2Message } = require('../../utils/componentUtils');
const { parseEmoji } = require('discord.js');

module.exports = {
    name: 'emoji',
    description: 'Récupère l’image d’un émoji',
    category: 'Utils',
    async run(client, message, args) {
        if (!args[0]) return sendV2Message(client, message.channel.id, "❌ Veuillez spécifier un émoji.", []);
        
        const emoji = parseEmoji(args[0]);
        if (!emoji || !emoji.id) {
             return sendV2Message(client, message.channel.id, "❌ Émoji invalide ou par défaut.", []);
        }

        const extension = emoji.animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=4096`;
        
        await sendV2Message(client, message.channel.id, `**Émoji: ${emoji.name}**\n${url}`, []);
    }
};