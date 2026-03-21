const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'massmention',
    description: 'massmention.description',
    category: 'Moderation',
    usage: 'massmention.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.massmention) config.moderation.massmention = { enabled: false, limit: 5 };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('massmention.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('common.loading_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        if (['on', 'off'].includes(arg)) {
            config.moderation.massmention.enabled = (arg === 'on');
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed(await t('common.configuration_title', message.guild.id), await t('massmention.success_state', message.guild.id, { status: arg.toUpperCase() }), arg === 'on' ? 'success' : 'warning')] });
            return;
        }

        const limit = parseInt(arg);
        if (isNaN(limit) || limit < 1) {
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('massmention.invalid_limit', message.guild.id), 'error')] });
            return;
        }

        config.moderation.massmention.limit = limit;
        config.moderation.massmention.enabled = true;
        config.markModified('moderation');
        await config.save();

        await replyMsg.edit({ embeds: [createEmbed(await t('common.configuration_title', message.guild.id), await t('massmention.success_config', message.guild.id, { limit }), 'success')] });
    }
};
