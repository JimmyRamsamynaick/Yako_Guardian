const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const axios = require('axios');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'lang',
    description: 'Gestion avancée des langues',
    category: 'Configuration',
    aliases: ['language'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('lang.permission', message.guild.id), 'error')] });
        }

        const sub = args[0];
        
        // --- +GET LANG ---
        if (sub === 'get' || message.content.includes('get lang')) {
            const settings = db.prepare('SELECT language, custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            const lang = settings?.language || 'fr';
            const yes = await t('common.yes', message.guild.id);
            const no = await t('common.no', message.guild.id);
            const custom = settings?.custom_lang_url ? `${yes} (${settings.custom_lang_url})` : no;
            
            const title = await t('lang.config_title', message.guild.id);
            const current = await t('lang.current_lang', message.guild.id, { lang: lang.toUpperCase() });
            const customText = await t('lang.custom_lang', message.guild.id, { custom: custom });

            return message.channel.send({ embeds: [createEmbed(title, `${current}\n${customText}`, 'info')] });
        }

        // --- +LANG CUSTOM ---
        if (sub === 'custom') {
            const option = args[1]; // on, off
            
            if (option === 'off') {
                db.prepare('UPDATE guild_settings SET custom_lang_url = NULL WHERE guild_id = ?').run(message.guild.id);
                return message.channel.send({ embeds: [createEmbed('Succès', await t('lang.custom_off', message.guild.id), 'success')] });
            }

            // Check for attachment
            const attachment = message.attachments.first();
            if (attachment) {
                if (!attachment.name.endsWith('.json')) {
                    return message.channel.send({ embeds: [createEmbed('Erreur', await t('lang.invalid_file_ext', message.guild.id), 'error')] });
                }
                
                const replyMsg = await message.channel.send({ embeds: [createEmbed('Chargement', `${THEME.icons.loading} Vérification du fichier...`, 'loading')] });

                // Verify JSON validity
                try {
                    const response = await axios.get(attachment.url);
                    if (typeof response.data !== 'object') throw new Error("Invalid JSON");
                    
                    db.prepare('UPDATE guild_settings SET custom_lang_url = ? WHERE guild_id = ?').run(attachment.url, message.guild.id);
                    return replyMsg.edit({ embeds: [createEmbed('Succès', await t('lang.custom_activated_file', message.guild.id), 'success')] });
                } catch (e) {
                    return replyMsg.edit({ embeds: [createEmbed('Erreur', await t('lang.invalid_json', message.guild.id), 'error')] });
                }
            }

            if (option === 'on') {
                const settings = db.prepare('SELECT custom_lang_url FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
                if (!settings?.custom_lang_url) {
                    return message.channel.send({ embeds: [createEmbed('Erreur', await t('lang.no_custom_config', message.guild.id), 'error')] });
                }
                return message.channel.send({ embeds: [createEmbed('Succès', await t('lang.custom_activated', message.guild.id), 'success')] });
            }

            return message.channel.send({ embeds: [createEmbed('Usage', await t('lang.custom_usage', message.guild.id), 'info')] });
        }

        const title = await t('lang.help_embed.title', message.guild.id);
        const description = await t('lang.help_embed.description', message.guild.id);
        return message.channel.send({ embeds: [createEmbed(title, description, 'info')] });
    }
};
