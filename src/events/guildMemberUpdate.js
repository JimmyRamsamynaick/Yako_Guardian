const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        // Check if boost status changed
        const oldStatus = oldMember.premiumSince;
        const newStatus = newMember.premiumSince;

        // If user just boosted (was not boosting, now is boosting)
        if (!oldStatus && newStatus) {
            try {
                const config = await getGuildConfig(newMember.guild.id);
                
                // Check if boost module is enabled and channel is set
                if (config.boost && config.boost.enabled && config.boost.channelId) {
                    const channel = newMember.guild.channels.cache.get(config.boost.channelId);
                    
                    if (channel && channel.isTextBased()) {
                         // Prepare texts
                         const title = config.boost.title || await t('boostembed.embed_title', newMember.guild.id);
                         const description = config.boost.description || await t('boostembed.embed_desc', newMember.guild.id, { user: newMember.toString(), count: newMember.guild.premiumSubscriptionCount });
                         let content = config.boost.message || await t('boostembed.message_content', newMember.guild.id, { user: newMember.toString() });

                         // Replace placeholders
                         const formatText = (text, isTitle = false) => {
                             if (!text) return text;
                             return text
                                .replace(/{{user}}/g, isTitle ? newMember.user.username : newMember.toString())
                                .replace(/{{username}}/g, newMember.user.username)
                                .replace(/{{tag}}/g, newMember.user.tag)
                                .replace(/{{count}}/g, newMember.guild.premiumSubscriptionCount);
                         };

                         // Build Boost Embed
                         const embed = createEmbed(formatText(title, true), formatText(description), 'default')
                            .setColor('#f47fff') // Boost Pink
                            .setFooter({ text: newMember.guild.name, iconURL: newMember.guild.iconURL({ dynamic: true }) })
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
                            embed.setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));
                        }

                        await channel.send({ content: formatText(content), embeds: [embed] });
                    }
                }
            } catch (error) {
                console.error(`Error in guildMemberUpdate (Boost detection) for guild ${newMember.guild.id}:`, error);
            }
        }
    }
};
