const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unhide',
    description: 'Affiche un salon (autorise @everyone à voir)',
    category: 'Moderation',
    usage: 'unhide [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Unhide', `${THEME.icons.loading} Affichage du salon...`, 'loading')] });

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: null // Reset
            });
            await replyMsg.edit({ embeds: [createEmbed(
                'Salon Visible',
                `${THEME.icons.success} Le salon <#${channel.id}> est maintenant visible.`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.unhide_error', message.guild.id), 'error')] });
        }
    }
};
