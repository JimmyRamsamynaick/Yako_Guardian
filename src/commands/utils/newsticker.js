const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'newsticker',
    description: 'Ajouter un sticker au serveur',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageEmojisAndStickers') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('newsticker.permission', message.guild.id), '', 'error')] });
        }

        const name = args.join(' ');
        const attachment = message.attachments.first();

        if (!name || !attachment) {
            return message.channel.send({ embeds: [createEmbed(await t('newsticker.usage', message.guild.id), '', 'info')] });
        }

        try {
            const sticker = await message.guild.stickers.create({
                file: attachment.url,
                name: name,
                tags: name // Tags are required, using name as default
            });
            message.channel.send({ embeds: [createEmbed(await t('newsticker.success', message.guild.id, { name: sticker.name }), '', 'success')] });
        } catch (error) {
            console.error(error);
            message.channel.send({ embeds: [createEmbed(await t('newsticker.error', message.guild.id, { error: error.message }), '', 'error')] });
        }
    }
};