const GuildConfig = require('../database/models/GuildConfig');
const logger = require('./logger');

async function checkPfp(client) {
    try {
        const configs = await GuildConfig.find({ 'pfp.enabled': true, 'pfp.channelId': { $exists: true } });

        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            const channel = guild.channels.cache.get(config.pfp.channelId);
            if (!channel || !channel.isTextBased()) continue;

            // Fetch random member
            // Fetching all members is expensive.
            // We can fetch a random chunk or just use cache if populated.
            // For large servers, this is tricky.
            // Let's try fetching a random member by ID or using cache.
            
            // Simplified: Use cache + fetch limit
            const members = guild.members.cache.filter(m => !m.user.bot && m.user.avatar);
            if (members.size === 0) continue;

            const randomMember = members.random();
            
            // Check if we already posted this user recently? (Optional)
            
            // Send PFP
            // "Type 17" implies no embeds?
            // "Envoi automatique de photos de profils aléatoires"
            // Usually just the image url works as an attachment or link.
            // Or "User Name: [Link]"
            
            try {
                await channel.send({ 
                    content: `**${randomMember.user.tag}**\n${randomMember.user.displayAvatarURL({ size: 1024, extension: 'png' })}` 
                });
            } catch (e) {
                // Channel deleted or no perms
            }
        }
    } catch (error) {
        logger.error('Error in PFP system:', error);
    }
}

module.exports = { checkPfp };
