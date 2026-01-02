const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'antilink',
    description: 'Configure le système anti-liens',
    category: 'Moderation',
    usage: 'antilink <on/off> [invite/all]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.antilink) config.moderation.antilink = { enabled: false, mode: 'invite' };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return sendV2Message(client, message.channel.id, await t('antilink.usage', message.guild.id), []);
        }

        if (['on', 'off'].includes(arg)) {
            config.moderation.antilink.enabled = (arg === 'on');
            if (args[1]) {
                const mode = args[1].toLowerCase();
                if (['invite', 'all'].includes(mode)) {
                    config.moderation.antilink.mode = mode;
                }
            }
            
            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, await t('antilink.success', message.guild.id, { 
                status: arg.toUpperCase(), 
                mode: config.moderation.antilink.mode 
            }), []);
        }
        
        // Handle "antilink invite" or "antilink all" direct shortcuts
        if (['invite', 'all'].includes(arg)) {
             config.moderation.antilink.mode = arg;
             config.moderation.antilink.enabled = true;
             config.markModified('moderation');
             await config.save();
             return sendV2Message(client, message.channel.id, await t('antilink.success', message.guild.id, { 
                status: "ON", 
                mode: arg 
            }), []);
        }

        return sendV2Message(client, message.channel.id, await t('antilink.usage', message.guild.id), []);
    }
};
