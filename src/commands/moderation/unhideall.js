const { PermissionsBitField, ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unhideall',
    description: 'Affiche tous les salons textuels du serveur',
    category: 'Moderation',
    usage: 'unhideall',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('UnhideAll', `${THEME.icons.loading} ${await t('moderation.unhideall_process', message.guild.id)}`, 'loading')] });

        const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        let count = 0;

        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    ViewChannel: null
                });
                count++;
            } catch (err) {
                // Ignore errors
            }
        }

        await replyMsg.edit({ embeds: [createEmbed(
            'Serveur Visible',
            `${THEME.icons.success} ${await t('moderation.unhideall_success', message.guild.id, { count })}`,
            'success'
        )] });
    }
};
