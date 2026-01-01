const { sendV2Message } = require('../../utils/componentUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');

module.exports = {
    name: 'snipe',
    description: 'Affiche le dernier message supprimé du salon',
    category: 'Utils',
    async run(client, message, args) {
        const snipe = client.snipes.get(message.channel.id);
        if (!snipe) return sendV2Message(client, message.channel.id, "❌ Aucun message supprimé récemment.", []);

        let content = `**De:** ${snipe.author} (<t:${Math.floor(snipe.date.getTime() / 1000)}:R>)\n**Contenu:** ${snipe.content}`;
        if (snipe.image) content += `\n**Image:** ${snipe.image}`;

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