const { sendV2Message } = require('../../utils/componentUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'snipe',
    description: 'Affiche le dernier message supprimé du salon',
    category: 'Utils',
    async run(client, message, args) {
        const snipe = client.snipes.get(message.channel.id);
        if (!snipe) return sendV2Message(client, message.channel.id, await t('snipe.empty', message.guild.id), []);

        let content = (await t('snipe.from', message.guild.id, { author: snipe.author, date: `<t:${Math.floor(snipe.date.getTime() / 1000)}:R>` })) + "\n" +
                      (await t('snipe.content', message.guild.id, { content: snipe.content }));
        
        if (snipe.image) content += "\n" + (await t('snipe.image', message.guild.id, { url: snipe.image }));

        const msg = await sendV2Message(client, message.channel.id, content, []);

        // Autodelete Response
        const config = await getGuildConfig(message.guild.id);
        if (config.autodelete?.snipe?.response > 0) {
            setTimeout(() => {
                 // REST delete (since we don't have Message object with delete method easily from REST result unless we fetch it, 
                 // actually sendV2Message returns the raw API response data, not a Discord.js Message structure)
                 // We can use client.rest.delete or fetch the channel and delete.
                 // Easier: client.rest.delete(Routes.channelMessage(channelId, messageId))
                 const { Routes } = require('discord.js');
                 client.rest.delete(Routes.channelMessage(message.channel.id, msg.id)).catch(() => {});
            }, config.autodelete.snipe.response);
        }
    }
};