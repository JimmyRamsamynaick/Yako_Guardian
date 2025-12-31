const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    description: 'Informations complètes du serveur',
    category: 'Utils',
    async run(client, message, args) {
        const guild = message.guild;
        const owner = await guild.fetchOwner();
        
        const info = [
            `**Nom:** ${guild.name}`,
            `**ID:** ${guild.id}`,
            `**Propriétaire:** ${owner.user.tag} (${owner.id})`,
            `**Création:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            `**Membres:** ${guild.memberCount}`,
            `**Salons:** ${guild.channels.cache.size} (Txt: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}, Voc: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size})`,
            `**Rôles:** ${guild.roles.cache.size}`,
            `**Emojis:** ${guild.emojis.cache.size}`,
            `**Boosts:** ${guild.premiumSubscriptionCount} (Niveau ${guild.premiumTier})`
        ].join('\n');

        await sendV2Message(client, message.channel.id, "**Informations du Serveur**\n\n" + info, []);
    }
};