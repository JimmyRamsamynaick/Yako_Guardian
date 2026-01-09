const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'boostembed',
    description: 'Configure le message de boost',
    category: 'Notifications',
    aliases: ['boost'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
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
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.state_change', message.guild.id, { state: sub.toUpperCase() }), '', 'success')] });
        }

        // +boostembed channel <#channel>
        if (['channel', 'salon', 'set'].includes(sub)) {
            if (!value) return message.channel.send({ embeds: [createEmbed(await t('boostembed.channel_usage', message.guild.id), '', 'error')] });

            let channelId = value.replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel || !channel.isTextBased()) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.channel_invalid', message.guild.id), '', 'error')] });
            }

            config.boost.channelId = channel.id;
            config.boost.enabled = true; // Auto enable
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.channel_success', message.guild.id, { channel: channel.toString() }), '', 'success')] });
        }

        // +boostembed message <content>
        if (['message', 'msg', 'content'].includes(sub)) {
            if (!content) return message.channel.send({ embeds: [createEmbed(await t('boostembed.message_usage', message.guild.id), '', 'error')] });

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.message = null;
                await config.save();
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.message_reset', message.guild.id), '', 'success')] });
            }

            config.boost.message = content;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.message_set', message.guild.id, { content }), '', 'success')] });
        }

        // +boostembed title <content>
        if (['title', 'titre'].includes(sub)) {
            if (!content) return message.channel.send({ embeds: [createEmbed(await t('boostembed.title_usage', message.guild.id), '', 'error')] });

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.title = null;
                await config.save();
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.title_reset', message.guild.id), '', 'success')] });
            }

            config.boost.title = content;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.title_set', message.guild.id, { content }), '', 'success')] });
        }

        // +boostembed description <content>
        if (['description', 'desc'].includes(sub)) {
            if (!content) return message.channel.send({ embeds: [createEmbed(await t('boostembed.description_usage', message.guild.id), '', 'error')] });

            if (['reset', 'default'].includes(content.toLowerCase())) {
                config.boost.description = null;
                await config.save();
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.description_reset', message.guild.id), '', 'success')] });
            }

            config.boost.description = content;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.description_set', message.guild.id, { content }), '', 'success')] });
        }

        // +boostembed image <url/reset>
        if (['image', 'img'].includes(sub)) {
            if (!value) return message.channel.send({ embeds: [createEmbed(await t('boostembed.image_usage', message.guild.id), '', 'error')] });

            if (['reset', 'off', 'default'].includes(value.toLowerCase())) {
                config.boost.image = null;
                await config.save();
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.image_reset', message.guild.id), '', 'success')] });
            }

            if (!value.startsWith('http')) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.invalid_url', message.guild.id), '', 'error')] });
            }

            config.boost.image = value;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.image_set', message.guild.id), '', 'success')] });
        }

        // +boostembed thumbnail <url/reset>
        if (['thumbnail', 'thumb'].includes(sub)) {
            if (!value) return message.channel.send({ embeds: [createEmbed(await t('boostembed.thumbnail_usage', message.guild.id), '', 'error')] });

            if (['reset', 'off', 'default'].includes(value.toLowerCase())) {
                config.boost.thumbnail = null;
                await config.save();
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.thumbnail_reset', message.guild.id), '', 'success')] });
            }

            if (!value.startsWith('http')) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.invalid_url', message.guild.id), '', 'error')] });
            }

            config.boost.thumbnail = value;
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('boostembed.thumbnail_set', message.guild.id), '', 'success')] });
        }

        // +boostembed test
        if (sub === 'test') {
            if (!config.boost.channelId) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.no_channel', message.guild.id), '', 'error')] });
            }

            const channel = message.guild.channels.cache.get(config.boost.channelId);
            if (!channel) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.channel_not_found', message.guild.id), '', 'error')] });
            }

            // Simulate Boost Embed
            const title = config.boost.title || await t('boostembed.embed_title', message.guild.id);
            const description = config.boost.description || await t('boostembed.embed_desc', message.guild.id, { user: message.author.toString(), count: message.guild.premiumSubscriptionCount });

            // Replace placeholders in custom title/desc
            const formatText = (text) => text
                .replace(/{{user}}/g, message.author.toString())
                .replace(/{{count}}/g, message.guild.premiumSubscriptionCount);

            const embed = createEmbed(formatText(title), formatText(description), 'default')
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

            const content = formatText(config.boost.message || await t('boostembed.message_content', message.guild.id, { user: message.author.toString() }));

            try {
                await channel.send({ content, embeds: [embed] });
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.test_sent', message.guild.id, { channel: channel.toString() }), '', 'success')] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(await t('boostembed.test_error', message.guild.id, { error: e.message }), '', 'error')] });
            }
        }

        // Default Usage
        return message.channel.send({ embeds: [createEmbed(await t('boostembed.help_title', message.guild.id), await t('boostembed.help_details', message.guild.id), 'info')] });
    }
};
