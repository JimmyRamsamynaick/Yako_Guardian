const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'antilink',
    description: 'antilink.description',
    category: 'Moderation',
    usage: 'antilink.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.antilink) config.moderation.antilink = { enabled: false, mode: 'invite' };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('antilink.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.antilink_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

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
            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.antilink_title', message.guild.id), await t('antilink.success', message.guild.id, { 
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
             await replyMsg.edit({ embeds: [createEmbed(await t('moderation.antilink_title', message.guild.id), await t('antilink.success', message.guild.id, { 
                status: "ON", 
                mode: arg 
            }), 'success')] });
             return;
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('antilink.usage', message.guild.id), 'warning')] });
    }
};
