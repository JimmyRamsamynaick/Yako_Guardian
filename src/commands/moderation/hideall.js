const { PermissionsBitField, ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'hideall',
    description: 'hideall.description',
    category: 'Moderation',
    usage: 'hideall.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.hideall_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.hideall_process', message.guild.id)}`, 'loading')] });

        const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        let count = 0;

        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    ViewChannel: false
                });
                count++;
            } catch (err) {
                // Ignore errors
            }
        }

        await replyMsg.edit({ embeds: [createEmbed(
            await t('moderation.hideall_success_title', message.guild.id),
            `${THEME.icons.success} ${await t('moderation.hideall_success', message.guild.id, { count })}`,
            'success'
        )] });
    }
};
