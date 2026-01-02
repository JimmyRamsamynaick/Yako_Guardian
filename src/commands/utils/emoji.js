const { sendV2Message } = require('../../utils/componentUtils');
const { parseEmoji } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'emoji',
    description: 'Récupère l’image d’un émoji',
    category: 'Utils',
    async run(client, message, args) {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('emoji.usage', message.guild.id), []);
        
        const emoji = parseEmoji(args[0]);
        if (!emoji || !emoji.id) {
             return sendV2Message(client, message.channel.id, await t('emoji.invalid', message.guild.id), []);
        }

        const extension = emoji.animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}?size=4096`;
        
        await sendV2Message(client, message.channel.id, await t('emoji.success', message.guild.id, { name: emoji.name, url: url }), []);
    }
};