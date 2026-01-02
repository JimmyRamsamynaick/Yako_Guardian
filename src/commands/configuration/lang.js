const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const axios = require('axios');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'lang',
    description: 'Gestion avancée des langues',
    category: 'Configuration',
    aliases: ['language'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return sendV2Message(client, message.channel.id, await t('lang.permission', message.guild.id), []);
        }

        const sub = args[0];
        
        // --- +GET LANG ---
        if (sub === 'get' || message.content.includes('get lang')) {
            const settings = db.prepare('SELECT language, custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            const lang = settings?.language || 'fr';
            const custom = settings?.custom_lang_url ? `Oui (${settings.custom_lang_url})` : 'Non';
            
            const title = await t('lang.config_title', message.guild.id);
            const current = await t('lang.current_lang', message.guild.id, { lang: lang.toUpperCase() });
            const customText = await t('lang.custom_lang', message.guild.id, { custom: custom });

            return sendV2Message(client, message.channel.id, `${title}\n\n${current}\n${customText}`, []);
        }

        // --- +LANG CUSTOM ---
        if (sub === 'custom') {
            const option = args[1]; // on, off
            
            if (option === 'off') {
                db.prepare('UPDATE guild_settings SET custom_lang_url = NULL WHERE guild_id = ?').run(message.guild.id);
                return sendV2Message(client, message.channel.id, await t('lang.custom_off', message.guild.id), []);
            }

            // Check for attachment
            const attachment = message.attachments.first();
            if (attachment) {
                if (!attachment.name.endsWith('.json')) {
                    return sendV2Message(client, message.channel.id, await t('lang.invalid_file_ext', message.guild.id), []);
                }
                
                // Verify JSON validity
                try {
                    const response = await axios.get(attachment.url);
                    if (typeof response.data !== 'object') throw new Error("Invalid JSON");
                    
                    db.prepare('UPDATE guild_settings SET custom_lang_url = ? WHERE guild_id = ?').run(attachment.url, message.guild.id);
                    return sendV2Message(client, message.channel.id, await t('lang.custom_activated_file', message.guild.id), []);
                } catch (e) {
                    return sendV2Message(client, message.channel.id, await t('lang.invalid_json', message.guild.id), []);
                }
            }

            if (option === 'on') {
                const settings = db.prepare('SELECT custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
                if (!settings?.custom_lang_url) {
                    return sendV2Message(client, message.channel.id, await t('lang.no_custom_config', message.guild.id), []);
                }
                return sendV2Message(client, message.channel.id, await t('lang.custom_activated', message.guild.id), []);
            }

            return sendV2Message(client, message.channel.id, await t('lang.custom_usage', message.guild.id), []);
        }

        return sendV2Message(client, message.channel.id, await t('lang.usage', message.guild.id), []);
    }
};
