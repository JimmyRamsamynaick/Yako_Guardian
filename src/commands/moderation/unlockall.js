const { PermissionsBitField, ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unlockall',
    description: 'Déverrouille tous les salons textuels du serveur',
    category: 'Moderation',
    usage: 'unlockall',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('UnlockAll', `${THEME.icons.loading} ${await t('moderation.unlockall_process', message.guild.id)}`, 'loading')] });

        const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        let count = 0;

        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: null
                });
                count++;
            } catch (err) {
                // Ignore errors
            }
        }

        await replyMsg.edit({ embeds: [createEmbed(
            'Serveur Déverrouillé',
            `${THEME.icons.success} ${await t('moderation.unlockall_success', message.guild.id, { count })}`,
            'success'
        )] });
    }
};
