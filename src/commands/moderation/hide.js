const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'hide',
    description: 'Masque un salon (empêche @everyone de voir)',
    category: 'Moderation',
    usage: 'hide [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Hide', `${THEME.icons.loading} Masquage du salon...`, 'loading')] });

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: false
            });
            await replyMsg.edit({ embeds: [createEmbed(
                'Salon Masqué',
                `${THEME.icons.success} Le salon <#${channel.id}> est maintenant masqué.`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.hide_error', message.guild.id), 'error')] });
        }
    }
};
