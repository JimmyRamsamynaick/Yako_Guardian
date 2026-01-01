const { ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot || !message.guild) return;
        if (message.channel.type !== ChannelType.GuildAnnouncement) return;

        // Fetch config
        // Optimization: Maybe cache configs or check a Set?
        // For now, simple fetch.
        const config = await getGuildConfig(message.guild.id);
        
        if (!config.autoPublish) return;

        // Check if specific channels are configured
        if (config.autoPublishChannels && config.autoPublishChannels.length > 0) {
            if (!config.autoPublishChannels.includes(message.channel.id)) return;
        }

        // Publish
        try {
            await message.crosspost();
            // Optional: React to confirm
            // await message.react('📢'); 
        } catch (e) {
            console.error(`Failed to crosspost message in ${message.guild.name}:`, e);
        }
    }
};
