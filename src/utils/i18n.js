const fs = require('fs');
const path = require('path');
const { db } = require('../database');
const axios = require('axios');

const locales = {
    fr: require('../locales/fr.json'),
    en: require('../locales/en.json')
};

// Cache for custom language files (URL -> JSON content)
const customLangCache = new Map();

/**
 * Helper to get nested object value by string path (e.g. "set.usage")
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
}

/**
 * Get translated string
 * @param {string} key - Key path (e.g. "common.error_admin_only")
 * @param {string} guildId - Guild ID to fetch preference
 * @param {object} variables - Variables to replace {{var}}
 * @returns {Promise<string>}
 */
async function t(key, guildId, variables = {}) {
    // 1. Get Guild Config
    const settings = db.prepare('SELECT language, custom_lang_url FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    let lang = settings?.language || 'fr';
    const customUrl = settings?.custom_lang_url;

    let text = null;

    // 2. Try Custom Language (if enabled)
    if (customUrl) {
        let customData = customLangCache.get(customUrl);
        if (!customData) {
            try {
                const res = await axios.get(customUrl);
                customData = res.data;
                customLangCache.set(customUrl, customData);
                // Clear cache after 10 mins
                setTimeout(() => customLangCache.delete(customUrl), 10 * 60 * 1000);
            } catch (e) {
                // Fallback
            }
        }
        if (customData) {
            text = getNestedValue(customData, key);
        }
    }

    // 3. Try Selected Language
    if (!text && locales[lang]) {
        text = getNestedValue(locales[lang], key);
    }

    // 4. Fallback to FR
    if (!text) {
        text = getNestedValue(locales['fr'], key);
    }

    // 5. Fallback to Key itself if everything fails
    if (!text) return key;

    // 6. Replace Variables
    for (const [varName, varValue] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{{${varName}}}`, 'g'), varValue);
    }

    return text;
}

module.exports = { t };