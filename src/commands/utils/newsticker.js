const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'newsticker',
    description: 'Ajouter un sticker au serveur',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageEmojisAndStickers') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('newsticker.permission', message.guild.id), []);
        }

        const name = args.join(' ');
        const attachment = message.attachments.first();

        if (!name || !attachment) {
            return sendV2Message(client, message.channel.id, await t('newsticker.usage', message.guild.id), []);
        }

        try {
            const sticker = await message.guild.stickers.create({
                file: attachment.url,
                name: name,
                tags: name // Tags are required, using name as default
            });
            sendV2Message(client, message.channel.id, await t('newsticker.success', message.guild.id, { name: sticker.name }), []);
        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, await t('newsticker.error', message.guild.id, { error: error.message }), []);
        }
    }
};