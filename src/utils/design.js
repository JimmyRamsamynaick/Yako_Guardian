const { EmbedBuilder } = require('discord.js');
const { db } = require('../database');

const THEME = {
    colors: {
        primary: '#2b2d31', // Dark Gray (Discord-like)
        secondary: '#5865F2', // Blurple
        success: '#43b581', // Green
        error: '#f04747', // Red
        warning: '#faa61a', // Orange
        info: '#00b0f4' // Blue
    },
    separators: {
        line: '━━━━━━━━━━━━━━━━━━━━━━━━',
        thin: '────────────────────────'
    },
    icons: {
        mod: '🛡️',
        settings: '⚙️',
        logs: '📜',
        tickets: '🎫',
        security: '🔒',
        utils: '🛠️',
        community: '👥',
        music: '🎵',
        success: '✅',
        error: '❌',
        loading: '⏳',
        wait: '🕐',
        info: 'ℹ️'
    }
};

/**
 * Creates a "Premium" styled embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description (main content)
 * @param {string} type - 'default', 'success', 'error', 'warning', 'loading'
 * @param {Object} [options] - Additional options (footer, author, etc.)
 */
function createEmbed(title, description, type = 'default', options = {}) {
    let color = THEME.colors.primary;
    let icon = '';

    switch (type) {
        case 'success':
            color = THEME.colors.success;
            icon = THEME.icons.success;
            break;
        case 'error':
            color = THEME.colors.error;
            icon = THEME.icons.error;
            break;
        case 'warning':
            color = THEME.colors.warning;
            icon = THEME.icons.wait;
            break;
        case 'loading':
            color = THEME.colors.secondary;
            icon = THEME.icons.loading;
            break;
        case 'moderation':
            color = THEME.colors.error;
            icon = THEME.icons.mod;
            break;
        case 'info':
            color = THEME.colors.info;
            icon = THEME.icons.info;
            break;
    }

    // Custom Theme Override
    if (options.guildId && (type === 'default' || type === 'info')) {
        try {
            const settings = db.prepare('SELECT theme_color FROM guild_settings WHERE guild_id = ?').get(options.guildId);
            if (settings && settings.theme_color) {
                color = settings.theme_color;
            }
        } catch (e) { 
            // Silent fail
        }
    }

    // Add icon to title if present
    const finalTitle = icon ? `${icon}  ${title}` : title;

    const embed = new EmbedBuilder()
        .setColor(color);

    if (description) embed.setDescription(description); // We use Description for the main "Body" to allow markdown blocks

    if (title) embed.setTitle(finalTitle);
    
    if (options.footer) embed.setFooter({ text: options.footer });
    if (options.image) embed.setImage(options.image);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    
    // Add a subtle timestamp for "Live" feel
    embed.setTimestamp();

    return embed;
}

/**
 * Generates a "Loading" embed with animation simulation
 * @param {string} text - Text to display
 */
function loadingEmbed(text) {
    return createEmbed('Traitement en cours', `**${THEME.icons.loading} ${text}**\n${THEME.separators.thin}`, 'loading');
}

/**
 * Generates a "Success" embed
 * @param {string} title 
 * @param {string} text 
 */
function successEmbed(title, text) {
    return createEmbed(title, `${THEME.icons.success} ${text}`, 'success');
}

/**
 * Generates an "Error" embed
 * @param {string} text 
 */
function errorEmbed(text) {
    return createEmbed('Erreur', `${THEME.icons.error} ${text}`, 'error');
}

module.exports = {
    THEME,
    createEmbed,
    loadingEmbed,
    successEmbed,
    errorEmbed
};
