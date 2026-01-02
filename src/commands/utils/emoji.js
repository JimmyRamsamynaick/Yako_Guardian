const { createEmbed } = require('../../utils/design');
const { parseEmoji } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'emoji',
    description: 'Récupère l’image d’un émoji',
    category: 'Utils',
    async run(client, message, args) {
        if (!args[0]) return message.channel.send({ embeds: [createEmbed(await t('emoji.usage', message.guild.id), '', 'info')] });
        
        const emoji = parseEmoji(args[0]);
        if (!emoji || !emoji.id) {
             return message.channel.send({ embeds: [createEmbed(await t('emoji.invalid', message.guild.id), '', 'error')] });
        }

        const extension = emoji.animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=4096`;
        
        const embed = createEmbed(await t('emoji.success', message.guild.id, { name: emoji.name, url: url }), '', 'success');
        embed.setImage(url);
        await message.channel.send({ embeds: [embed] });
    }
};