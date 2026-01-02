const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'boostembed',
    description: 'Configure le message de boost',
    category: 'Notifications',
    aliases: ['boost'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.boost) config.boost = { enabled: false, channelId: null };

        const sub = args[0]?.toLowerCase();
        const value = args[1];
        const content = args.slice(1).join(' ');

        // +boostembed <on/off>
        if (['on', 'off'].includes(sub)) {
            config.boost.enabled = (sub === 'on');
            if (sub === 'on' && !config.boost.channelId) {
                // If turning on but no channel set, default to current channel
                config.boost.channelId = message.channel.id;
            }
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.state_change', message.guild.id, { state: sub.toUpperCase() }), []);
        }

        // +boostembed channel <#channel>
        if (['channel', 'salon', 'set'].includes(sub)) {
            if (!value) return sendV2Message(client, message.channel.id, await t('boostembed.channel_usage', message.guild.id), []);

            let channelId = value.replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel || !channel.isTextBased()) {
                return sendV2Message(client, message.channel.id, await t('boostembed.channel_invalid', message.guild.id), []);
            }

            config.boost.channelId = channel.id;
            config.boost.enabled = true; // Auto enable
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.channel_success', message.guild.id, { channel: channel.toString() }), []);
        }

        // +boostembed message <content>
        if (['message', 'msg', 'content'].includes(sub)) {
            if (!content) return sendV2Message(client, message.channel.id, await t('boostembed.message_usage', message.guild.id), []);

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.message = null;
                await config.save();
                return sendV2Message(client, message.channel.id, await t('boostembed.message_reset', message.guild.id), []);
            }

            config.boost.message = content;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.message_set', message.guild.id, { content }), []);
        }

        // +boostembed title <content>
        if (['title', 'titre'].includes(sub)) {
            if (!content) return sendV2Message(client, message.channel.id, await t('boostembed.title_usage', message.guild.id), []);

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.title = null;
                await config.save();
                return sendV2Message(client, message.channel.id, await t('boostembed.title_reset', message.guild.id), []);
            }

            config.boost.title = content;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.title_set', message.guild.id, { content }), []);
        }

        // +boostembed description <content>
        if (['description', 'desc'].includes(sub)) {
            if (!content) return sendV2Message(client, message.channel.id, await t('boostembed.description_usage', message.guild.id), []);

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.description = null;
                await config.save();
                return sendV2Message(client, message.channel.id, await t('boostembed.description_reset', message.guild.id), []);
            }

            config.boost.description = content;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.description_set', message.guild.id, { content }), []);
        }

        // +boostembed image <url/reset>
        if (['image', 'img'].includes(sub)) {
            if (!value) return sendV2Message(client, message.channel.id, await t('boostembed.image_usage', message.guild.id), []);

            if (['reset', 'off', 'default'].includes(value.toLowerCase())) {
                config.boost.image = null;
                await config.save();
                return sendV2Message(client, message.channel.id, await t('boostembed.image_reset', message.guild.id), []);
            }

            if (!value.startsWith('http')) {
                return sendV2Message(client, message.channel.id, await t('boostembed.invalid_url', message.guild.id), []);
            }

            config.boost.image = value;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.image_set', message.guild.id), []);
        }

        // +boostembed thumbnail <url/reset>
        if (['thumbnail', 'thumb'].includes(sub)) {
            if (!value) return sendV2Message(client, message.channel.id, await t('boostembed.thumbnail_usage', message.guild.id), []);

            if (['reset', 'off', 'default'].includes(value.toLowerCase())) {
                config.boost.thumbnail = null;
                await config.save();
                return sendV2Message(client, message.channel.id, await t('boostembed.thumbnail_reset', message.guild.id), []);
            }

            if (!value.startsWith('http')) {
                return sendV2Message(client, message.channel.id, await t('boostembed.invalid_url', message.guild.id), []);
            }

            config.boost.thumbnail = value;
            await config.save();
            return sendV2Message(client, message.channel.id, await t('boostembed.thumbnail_set', message.guild.id), []);
        }

        // +boostembed test
        if (sub === 'test') {
            if (!config.boost.channelId) {
                return sendV2Message(client, message.channel.id, await t('boostembed.no_channel', message.guild.id), []);
            }

            const channel = message.guild.channels.cache.get(config.boost.channelId);
            if (!channel) {
                return sendV2Message(client, message.channel.id, await t('boostembed.channel_not_found', message.guild.id), []);
            }

            // Simulate Boost Embed
            const title = config.boost.title || await t('boostembed.embed_title', message.guild.id);
            const description = config.boost.description || await t('boostembed.embed_desc', message.guild.id, { user: message.author.toString(), count: message.guild.premiumSubscriptionCount });

            // Replace placeholders in custom title/desc
            const formatText = (text) => text
                .replace(/{{user}}/g, message.author.toString())
                .replace(/{{count}}/g, message.guild.premiumSubscriptionCount);

            const embed = new EmbedBuilder()
                .setTitle(formatText(title))
                .setDescription(formatText(description))
                .setColor('#f47fff') // Boost Pink
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
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
                embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
            }

            let content = config.boost.message || await t('boostembed.message_content', message.guild.id, { user: message.author.toString() });
            content = formatText(content);

            try {
                await channel.send({ content, embeds: [embed] });
                return sendV2Message(client, message.channel.id, await t('boostembed.test_sent', message.guild.id, { channel: channel.toString() }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('boostembed.test_error', message.guild.id, { error: e.message }), []);
            }
        }

        // Default Usage
        return sendV2Message(client, message.channel.id, await t('boostembed.help_details', message.guild.id), []);
    }
};
