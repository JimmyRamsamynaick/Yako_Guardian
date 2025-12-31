const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const axios = require('axios');

module.exports = {
    name: 'lang',
    description: 'Gestion avancée des langues',
    category: 'Configuration',
    aliases: ['language'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour utiliser cette commande.", []);
        }

        const sub = args[0];
        
        // --- +GET LANG ---
        if (sub === 'get' || message.content.includes('get lang')) {
            const settings = db.prepare('SELECT language, custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            const lang = settings?.language || 'fr';
            const custom = settings?.custom_lang_url ? `Oui (${settings.custom_lang_url})` : 'Non';
            
            return sendV2Message(client, message.channel.id, `🌍 **Configuration Langue**\n\n• Langue actuelle: **${lang.toUpperCase()}**\n• Langue personnalisée: **${custom}**`, []);
        }

        // --- +LANG CUSTOM ---
        if (sub === 'custom') {
            const option = args[1]; // on, off
            
            if (option === 'off') {
                db.prepare('UPDATE guild_settings SET custom_lang_url = NULL WHERE guild_id = ?').run(message.guild.id);
                return sendV2Message(client, message.channel.id, "✅ Langue personnalisée désactivée.", []);
            }

            // Check for attachment
            const attachment = message.attachments.first();
            if (attachment) {
                if (!attachment.name.endsWith('.json')) {
                    return sendV2Message(client, message.channel.id, "❌ Le fichier doit être un `.json` valide.", []);
                }
                
                // Verify JSON validity
                try {
                    const response = await axios.get(attachment.url);
                    if (typeof response.data !== 'object') throw new Error("Invalid JSON");
                    
                    db.prepare('UPDATE guild_settings SET custom_lang_url = ? WHERE guild_id = ?').run(attachment.url, message.guild.id);
                    return sendV2Message(client, message.channel.id, "✅ Langue personnalisée activée ! Le bot utilisera ce fichier pour les textes.", []);
                } catch (e) {
                    return sendV2Message(client, message.channel.id, "❌ Le fichier JSON semble invalide.", []);
                }
            }

            if (option === 'on') {
                const settings = db.prepare('SELECT custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
                if (!settings?.custom_lang_url) {
                    return sendV2Message(client, message.channel.id, "❌ Aucune langue personnalisée n'a été configurée. Envoyez un fichier JSON avec la commande.", []);
                }
                return sendV2Message(client, message.channel.id, "✅ Langue personnalisée activée.", []);
            }

            return sendV2Message(client, message.channel.id, "❌ Usage: `+lang custom <off>` ou envoyez un fichier `.json` avec la commande.", []);
        }

        return sendV2Message(client, message.channel.id, "❌ Usage: `+lang custom` ou `+set lang <fr/en>`.", []);
    }
};
