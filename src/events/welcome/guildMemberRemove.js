const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'guildMemberRemove',
    async execute(client, member) {
        try {
            const config = await getGuildConfig(member.guild.id);
            if (!config || !config.goodbye || !config.goodbye.enabled || !config.goodbye.channelId) return;

            const channel = member.guild.channels.cache.get(config.goodbye.channelId);
            if (!channel || !channel.isTextBased()) return;

            let message = config.goodbye.message || await t('goodbye.default_message', member.guild.id);
            
            // Replace placeholders
            // Note: member.toString() might not work if they left, use user.tag or username
            message = message
                .replace(/{user}/g, member.user.tag) 
                .replace(/{server}/g, member.guild.name)
                .replace(/{count}/g, member.guild.memberCount.toString());

            await channel.send({ 
                content: `Au revoir **${member.user.tag}** !`,
                embeds: [createEmbed(await t('goodbye.title', member.guild.id), message, 'default')] 
            }).catch(() => {});

        } catch (error) {
            console.error(`Error in goodbye event for guild ${member.guild.id}:`, error);
        }
    }
};
