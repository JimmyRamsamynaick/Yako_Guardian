const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'timeout',
    description: 'Active/Désactive l\'utilisation du Timeout Discord au lieu du rôle Mute',
    category: 'Moderation',
    usage: 'timeout <on/off>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(sub)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.timeout_usage', message.guild.id), 'warning')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.timeout_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.timeout_loading', message.guild.id)}`, 'loading')] });

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        
        config.moderation.timeoutEnabled = (sub === 'on');
        config.markModified('moderation');
        await config.save();

        const statusText = sub === 'on' ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
        const type = sub === 'on' ? 'success' : 'warning';
        const desc = sub === 'on' ? await t('moderation.timeout_enabled_desc', message.guild.id) : await t('moderation.timeout_disabled_desc', message.guild.id);

        const embed = createEmbed(
            await t('moderation.timeout_config_title', message.guild.id),
            `${THEME.separators.line}\n` +
            `**${await t('common.status', message.guild.id) || 'Statut'} :** ${statusText}\n\n` +
            `${desc}\n` +
            `${THEME.separators.line}`,
            type
        );

        await replyMsg.edit({ embeds: [embed] });
    }
};
