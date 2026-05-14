const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'lock',
    description: 'lock.description',
    category: 'Moderation',
    usage: 'lock.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.lock_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.lock_process', message.guild.id)}`, 'loading')] });

        try {
            // 1. Lock @everyone
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            // 2. Check ALL existing permission overrides and disable SendMessages for all of them
            const promises = [];
            const overwrites = channel.permissionOverwrites.cache;
            
            for (const [id, overwrite] of overwrites) {
                // Skip @everyone because we already did it, skip the bot owner and the server owner
                if (id === message.guild.roles.everyone.id) continue;
                
                // Check if this overwrite allows SendMessages explicitly
                if (overwrite.allow.has(PermissionsBitField.Flags.SendMessages)) {
                    promises.push(channel.permissionOverwrites.edit(id, {
                        SendMessages: null // Remove the allow to let @everyone's deny take effect
                    }).catch(() => {}));
                }
            }
            
            await Promise.all(promises);
            
            await replyMsg.edit({ embeds: [createEmbed(
                await t('moderation.lock_success_title', message.guild.id),
                `${THEME.icons.success} ${await t('moderation.lock_success', message.guild.id, { channelId: channel.id })}`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.lock_error', message.guild.id), 'error')] });
        }
    }
};
