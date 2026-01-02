const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autodelete',
    description: 'Configure la suppression automatique des commandes et réponses',
    category: 'Moderation',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('autodelete.admin_only', message.guild.id), []);
        }

        // +autodelete <moderation/snipe> <commande/reply> <on/off/durée>
        const category = args[0]?.toLowerCase();
        const type = args[1]?.toLowerCase(); // command or response (reply)
        const value = args[2]?.toLowerCase();

        if (!category || !type || !value) {
            return sendV2Message(client, message.channel.id, await t('autodelete.usage', message.guild.id), []);
        }

        if (!['moderation', 'snipe'].includes(category)) return sendV2Message(client, message.channel.id, await t('autodelete.invalid_category', message.guild.id), []);
        if (!['command', 'response'].includes(type)) return sendV2Message(client, message.channel.id, await t('autodelete.invalid_type', message.guild.id), []);

        const config = await getGuildConfig(message.guild.id);
        
        let settingValue;
        if (value === 'on') settingValue = 0; // Immediate delete? Or default enabled? 
        // Logic: 
        // command: boolean (delete or not)
        // response: number (delay in ms, 0 = no delete)
        // But user asks <on/off/durée>.
        
        // Let's adapt:
        // For command: on = true, off = false. (Duration doesn't apply to command usually, or maybe it does?)
        // For response: on = 5000ms (default), off = 0, duration = parsed ms.

        if (type === 'command') {
            if (value === 'on') config.autodelete[category].command = true;
            else if (value === 'off') config.autodelete[category].command = false;
            else return sendV2Message(client, message.channel.id, await t('autodelete.command_bool_error', message.guild.id), []);
        } else {
            // response
            if (value === 'off') {
                config.autodelete[category].response = 0;
            } else {
                let ms = 0;
                if (value === 'on') ms = 5000; // Default 5s
                else {
                    const match = value.match(/^(\d+)(s|m|h)?$/);
                    if (!match) return sendV2Message(client, message.channel.id, await t('autodelete.invalid_duration_short', message.guild.id), []);
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
        const msg = await sendV2Message(client, message.channel.id, await t('autodelete.success', message.guild.id, { category, type }), []);

        // Autodelete Response (Recursion!)
        if (config.autodelete?.moderation?.response > 0) {
            setTimeout(() => {
                const { Routes } = require('discord.js');
                client.rest.delete(Routes.channelMessage(message.channel.id, msg.id)).catch(() => {});
            }, config.autodelete.moderation.response);
        }
    }
};
