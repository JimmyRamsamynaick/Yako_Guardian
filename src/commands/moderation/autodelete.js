const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'autodelete',
    description: 'Configure la suppression automatique des commandes et réponses',
    category: 'Moderation',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('autodelete.admin_only', message.guild.id), 'error')] });
        }

        // +autodelete <moderation/snipe> <commande/reply> <on/off/durée>
        const category = args[0]?.toLowerCase();
        const type = args[1]?.toLowerCase(); // command or response (reply)
        const value = args[2]?.toLowerCase();

        if (!category || !type || !value) {
            return message.channel.send({ embeds: [createEmbed('Utilisation', await t('autodelete.usage', message.guild.id), 'info')] });
        }

        if (!['moderation', 'snipe'].includes(category)) return message.channel.send({ embeds: [createEmbed('Erreur', await t('autodelete.invalid_category', message.guild.id), 'error')] });
        if (!['command', 'response'].includes(type)) return message.channel.send({ embeds: [createEmbed('Erreur', await t('autodelete.invalid_type', message.guild.id), 'error')] });

        const replyMsg = await message.channel.send({ embeds: [createEmbed('AutoDelete', `${THEME.icons.loading} Configuration en cours...`, 'loading')] });

        const config = await getGuildConfig(message.guild.id);
        
        let settingValue;
        
        if (type === 'command') {
            if (value === 'on') config.autodelete[category].command = true;
            else if (value === 'off') config.autodelete[category].command = false;
            else {
                await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('autodelete.command_bool_error', message.guild.id), 'error')] });
                return;
            }
        } else {
            // response
            if (value === 'off') {
                config.autodelete[category].response = 0;
            } else {
                let ms = 0;
                if (value === 'on') ms = 5000; // Default 5s
                else {
                    const match = value.match(/^(\d+)(s|m|h)?$/);
                    if (!match) {
                        await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('autodelete.invalid_duration_short', message.guild.id), 'error')] });
                        return;
                    }
                    const amount = parseInt(match[1]);
                    const unit = match[2] || 's';
                    if (unit === 's') ms = amount * 1000;
                    else if (unit === 'm') ms = amount * 60000;
                    else if (unit === 'h') ms = amount * 3600000;
                }
                config.autodelete[category].response = ms;
            }
        }

        await config.save();
        
        await replyMsg.edit({ embeds: [createEmbed('Succès', await t('autodelete.success', message.guild.id, { category, type }), 'success')] });

        // Autodelete Response (Recursion!)
        if (config.autodelete?.moderation?.response > 0) {
            setTimeout(() => {
                const { Routes } = require('discord.js');
                client.rest.delete(Routes.channelMessage(message.channel.id, replyMsg.id)).catch(() => {});
            }, config.autodelete.moderation.response);
        }
    }
};
