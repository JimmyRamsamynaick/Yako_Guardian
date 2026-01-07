const GuildConfig = require('../database/models/GuildConfig');
const logger = require('./logger');
const lastPfpPosted = new Map();

async function checkPfp(client) {
    try {
        const configs = await GuildConfig.find({ 'pfp.enabled': true, 'pfp.channelId': { $exists: true } });

        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            const channel = guild.channels.cache.get(config.pfp.channelId);
            if (!channel || !channel.isTextBased()) continue;

            await guild.members.fetch().catch(() => null);
            let members = guild.members.cache.filter(m => !m.user.bot);
            if (members.size === 0) continue;

            const lastId = lastPfpPosted.get(guild.id);
            if (lastId && members.size > 1) {
                members = members.filter(m => m.id !== lastId);
            }
            const randomMember = members.random();
            lastPfpPosted.set(guild.id, randomMember.id);
            
            try {
                await channel.send({ 
                    content: `**${randomMember.user.tag}**\n${randomMember.user.displayAvatarURL({ size: 1024, extension: 'png' })}` 
                });
            } catch (e) {
            }
        }
    } catch (error) {
        logger.error('Error in PFP system:', error);
    }
}

module.exports = { checkPfp };
