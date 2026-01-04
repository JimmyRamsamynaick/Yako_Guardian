const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'antispam',
    description: 'antispam.description',
    category: 'Moderation',
    usage: 'antispam.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.antispam) config.moderation.antispam = { enabled: false, limit: 5, time: 5000 };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('antispam.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.antispam_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        if (['on', 'off'].includes(arg)) {
            config.moderation.antispam.enabled = (arg === 'on');
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.antispam_title', message.guild.id), await t('antispam.success_state', message.guild.id, { status: arg.toUpperCase() }), arg === 'on' ? 'success' : 'warning')] });
            return;
        }

        // Parse 5/5s
        if (arg.includes('/')) {
            const [limitStr, timeStr] = arg.split('/');
            const limit = parseInt(limitStr);
            
            let time = 5000;
            const match = timeStr.match(/^(\d+)(s|m|h)?$/);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2] || 's';
                if (unit === 's') time = val * 1000;
                else if (unit === 'm') time = val * 60 * 1000;
                else if (unit === 'h') time = val * 3600 * 1000;
            } else {
                 await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('antispam.invalid_time', message.guild.id), 'error')] });
                 return;
            }

            if (isNaN(limit) || limit < 1) {
                await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('antispam.invalid_limit', message.guild.id), 'error')] });
                return;
            }

            config.moderation.antispam.limit = limit;
            config.moderation.antispam.time = time;
            config.moderation.antispam.enabled = true; // Auto enable on config
            config.markModified('moderation');
            await config.save();

            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.antispam_configured_title', message.guild.id), await t('antispam.success_config', message.guild.id, { limit, time: timeStr }), 'success')] });
            return;
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('antispam.usage', message.guild.id), 'warning')] });
    }
};
