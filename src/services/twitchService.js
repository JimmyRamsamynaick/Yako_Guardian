const axios = require('axios');
const TwitchAlert = require('../database/models/TwitchAlert');
const { createEmbed } = require('../utils/design');
const logger = require('../utils/logger');
const { t } = require('../utils/i18n');
const { EmbedBuilder } = require('discord.js');

let twitchToken = null;
let tokenExpiresAt = 0;

async function getTwitchToken() {
    if (twitchToken && Date.now() < tokenExpiresAt) {
        return twitchToken;
    }

    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });

        twitchToken = response.data.access_token;
        tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Expire 1 minute early
        return twitchToken;
    } catch (error) {
        logger.error('Failed to get Twitch access token:', error.message);
        return null;
    }
}

async function checkTwitchStreams(client) {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        // logger.warn('Twitch credentials missing in .env');
        return;
    }

    const alerts = await TwitchAlert.find({});
    if (alerts.length === 0) return;

    // Deduplicate channels to query
    const channelNames = [...new Set(alerts.map(a => {
        // Fix: Strip URL if present (migration on the fly)
        const match = a.channelName.match(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
        return match ? match[1] : a.channelName;
    }))];
    const token = await getTwitchToken();

    if (!token) return;

    // Twitch API allows up to 100 users per request
    const chunks = [];
    for (let i = 0; i < channelNames.length; i += 100) {
        chunks.push(channelNames.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        try {
            const query = chunk.map(name => `user_login=${encodeURIComponent(name)}`).join('&');
            const response = await axios.get(`https://api.twitch.tv/helix/streams?${query}`, {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${token}`
                }
            });

            const streams = response.data.data;
            const streamMap = new Map(streams.map(s => [s.user_login.toLowerCase(), s]));

            // Process alerts
            for (const alert of alerts) {
                // Normalize alert channel name (strip URL if present)
                let alertChannelName = alert.channelName;
                const match = alertChannelName.match(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
                if (match) alertChannelName = match[1];

                const stream = streamMap.get(alertChannelName.toLowerCase());

                if (stream && stream.type === 'live') {
                    if (alert.lastStreamId !== stream.id) {
                        // New stream detected!
                        await sendTwitchAlert(client, alert, stream);
                        
                        alert.lastStreamId = stream.id;
                        await alert.save();
                    }
                } else if (!stream && alert.lastStreamId) {
                    // Stream ended or offline, reset if needed (optional, keeping id is fine to prevent dupes if it flickers)
                    // But if they restart a NEW stream, the ID will change, so we are good.
                    // We might want to clear it if we want to re-alert on the SAME stream id if they restart the bot? 
                    // No, keeping it is safer.
                }
            }

        } catch (error) {
            logger.error('Error checking Twitch streams:', error.message);
        }
    }
}

async function sendTwitchAlert(client, alert, stream) {
    try {
        const channel = await client.channels.fetch(alert.discordChannelId);
        if (!channel || !channel.isTextBased()) return;

        // Fetch user info for profile picture
        const token = await getTwitchToken();
        const userResponse = await axios.get(`https://api.twitch.tv/helix/users?id=${stream.user_id}`, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });
        const user = userResponse.data.data[0];

        const streamUrl = `https://twitch.tv/${stream.user_name}`;
        const messageContent = alert.message
            .replace('{streamer}', stream.user_name)
            .replace('{link}', streamUrl);

        const alertTitle = await t('notifications.handler.twitch.alert_title', alert.guildId, { streamer: stream.user_name });
        const gameLabel = await t('notifications.handler.twitch.alert_game', alert.guildId);
        const viewersLabel = await t('notifications.handler.twitch.alert_viewers', alert.guildId);
        const footerText = await t('notifications.handler.twitch.alert_footer', alert.guildId);
        const noneLabel = await t('notifications.handler.common.none', alert.guildId) || 'None';

        const embed = new EmbedBuilder()
            .setColor('#9146FF') // Twitch Purple
            .setAuthor({ name: alertTitle, iconURL: user?.profile_image_url, url: streamUrl })
            .setTitle(stream.title || 'Nouvelle diffusion')
            .setURL(streamUrl)
            .addFields(
                { name: gameLabel, value: stream.game_name || noneLabel, inline: true },
                { name: viewersLabel, value: `${stream.viewer_count}`, inline: true }
            )
            .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)
            .setFooter({ text: footerText, iconURL: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png' })
            .setTimestamp(new Date(stream.started_at));

        await channel.send({ content: messageContent, embeds: [embed] });

    } catch (error) {
        logger.error(`Failed to send Twitch alert for ${alert.channelName} in ${alert.guildId}:`, error.message);
    }
}

module.exports = { checkTwitchStreams };
