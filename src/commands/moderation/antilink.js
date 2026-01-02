const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'antilink',
    description: 'Configure le système anti-liens',
    category: 'Moderation',
    usage: 'antilink <on/off> [invite/all]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.antilink) config.moderation.antilink = { enabled: false, mode: 'invite' };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return message.channel.send({ embeds: [createEmbed('Utilisation', await t('antilink.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('AntiLink', `${THEME.icons.loading} Configuration en cours...`, 'loading')] });

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
            await replyMsg.edit({ embeds: [createEmbed('AntiLink', await t('antilink.success', message.guild.id, { 
                status: arg.toUpperCase(), 
                mode: config.moderation.antilink.mode 
            }), arg === 'on' ? 'success' : 'warning')] });
            return;
        }
        
        // Handle "antilink invite" or "antilink all" direct shortcuts
        if (['invite', 'all'].includes(arg)) {
             config.moderation.antilink.mode = arg;
             config.moderation.antilink.enabled = true;
             config.markModified('moderation');
             await config.save();
             await replyMsg.edit({ embeds: [createEmbed('AntiLink', await t('antilink.success', message.guild.id, { 
                status: "ON", 
                mode: arg 
            }), 'success')] });
             return;
        }

        await replyMsg.edit({ embeds: [createEmbed('Utilisation', await t('antilink.usage', message.guild.id), 'warning')] });
    }
};
