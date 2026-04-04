const { createEmbed } = require('./design');
const { t } = require('./i18n');
const { getGuildConfig } = require('./mongoUtils');

/**
 * Sends a boost thank you message to the configured channel
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').GuildMember} member 
 * @param {number} currentCount The current total boost count of the server (optional)
 */
async function sendBoostThanks(client, guild, member, currentCount = null) {
    try {
        const config = await getGuildConfig(guild.id);
        
        // Check if boost module is enabled and channel is set
        if (config.boost && config.boost.enabled && config.boost.channelId) {
            const channel = guild.channels.cache.get(config.boost.channelId);
            
            if (channel && channel.isTextBased()) {
                const finalCount = currentCount || guild.premiumSubscriptionCount || 0;

                // Prepare texts
                const title = config.boost.title || await t('boostembed.embed_title', guild.id);
                const description = config.boost.description || await t('boostembed.embed_desc', guild.id, { user: member.toString(), count: finalCount });
                let content = config.boost.message || await t('boostembed.message_content', guild.id, { user: member.toString() });

                // Replace placeholders
                const formatText = (text, isTitle = false) => {
                    if (!text) return text;
                    return text
                        .replace(/{{user}}/g, isTitle ? member.user.username : member.toString())
                        .replace(/{{username}}/g, member.user.username)
                        .replace(/{{tag}}/g, member.user.tag)
                        .replace(/{{count}}/g, finalCount.toString());
                };

                // Build Boost Embed
                const embed = createEmbed(formatText(title, true), formatText(description), 'default')
                    .setColor('#f47fff') // Boost Pink
                    .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                // Set Image (Custom or Default)
                if (config.boost.image) {
                    embed.setImage(config.boost.image);
                } else {
                    embed.setImage('https://i.imgur.com/0i7zY8C.gif');
                }

                // Set Thumbnail (Custom or User Avatar)
                if (config.boost.thumbnail) {
                    embed.setThumbnail(config.boost.thumbnail);
                } else {
                    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
                }

                await channel.send({ content: formatText(content), embeds: [embed] });
                return true;
            }
        }
    } catch (error) {
        console.error(`Error sending boost thanks for guild ${guild.id}:`, error);
    }
    return false;
}

module.exports = { sendBoostThanks };
