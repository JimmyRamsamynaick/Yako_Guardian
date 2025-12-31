const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');

module.exports = {
    name: 'channel',
    description: 'Informations relatives à un salon',
    category: 'Utils',
    async run(client, message, args) {
        const channelId = args[0]?.replace(/[<#>]/g, '') || message.channel.id;
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel) {
            return sendV2Message(client, message.channel.id, "❌ Salon introuvable.", []);
        }

        const info = [
            `**Nom:** ${channel.name}`,
            `**ID:** ${channel.id}`,
            `**Type:** ${Object.keys(ChannelType).find(key => ChannelType[key] === channel.type)}`,
            `**Catégorie:** ${channel.parent ? channel.parent.name : 'Aucune'}`,
            `**Créé le:** <t:${Math.floor(channel.createdTimestamp / 1000)}:R>`,
            `**Position:** ${channel.position}`
        ].join('\n');

        await sendV2Message(client, message.channel.id, `**Info Salon: ${channel.name}**\n\n${info}`, []);
    }
};