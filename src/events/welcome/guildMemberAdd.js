const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        // Small delay to ensure we don't welcome raids/kicked users immediately
        await new Promise(r => setTimeout(r, 1000));
        try {
            // Check if member is still in guild (fetched fresh)
            const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
            if (!freshMember) return;

            const config = await getGuildConfig(member.guild.id);
            if (!config || !config.welcome || !config.welcome.enabled || !config.welcome.channelId) return;

            const channel = member.guild.channels.cache.get(config.welcome.channelId);
            if (!channel || !channel.isTextBased()) return;

            let message = config.welcome.message || await t('welcome.default_message', member.guild.id);
            
            // Replace placeholders
            message = message
                .replace(/{user}/g, member.toString())
                .replace(/{server}/g, member.guild.name)
                .replace(/{count}/g, member.guild.memberCount.toString());

            // Send simple text message (Type 17 requirement: no embeds)
            await sendV2Message(client, channel.id, message, []);

        } catch (error) {
            console.error(`Error in welcome event for guild ${member.guild.id}:`, error);
        }
    }
};
