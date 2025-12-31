const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'newsticker',
    description: 'Ajouter un sticker au serveur',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageEmojisAndStickers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les stickers` requise.", []);
        }

        const name = args.join(' ');
        const attachment = message.attachments.first();

        if (!name || !attachment) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** Attachez une image (PNG/APNG) et faites `+newsticker <nom>`", []);
        }

        try {
            const sticker = await message.guild.stickers.create({
                file: attachment.url,
                name: name,
                tags: name // Tags are required, using name as default
            });
            sendV2Message(client, message.channel.id, `✅ Sticker **${sticker.name}** créé !`, []);
        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, `❌ Erreur : ${error.message}`, []);
        }
    }
};