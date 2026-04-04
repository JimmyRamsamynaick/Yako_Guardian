const { getGuildConfig } = require('../utils/mongoUtils');
const { checkAutomod } = require('../utils/moderation/automod');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, newMessage) {
        // Handle partials for newMessage
        if (newMessage.partial) {
            try {
                await newMessage.fetch();
            } catch (error) {
                return;
            }
        }

        // Ignore bots and DM
        if (!newMessage.author || newMessage.author.bot) return;
        if (!newMessage.guild) return;

        // Skip if content didn't change (e.g. only embeds changed)
        // If oldMessage is partial, content might be null, so we proceed with the check
        if (oldMessage.content && oldMessage.content === newMessage.content) return;

        // Get guild configuration
        const config = await getGuildConfig(newMessage.guild.id);
        if (!config || !config.moderation) return;

        // Trigger AutoMod check on the edited message
        // This will catch links, badwords, everyone, etc.
        await checkAutomod(client, newMessage, config);
    }
};
