const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'unlock',
    description: 'Déverrouille un salon (autorise @everyone à parler)',
    category: 'Moderation',
    usage: 'unlock [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Unlock', `${THEME.icons.loading} Déverrouillage du salon...`, 'loading')] });

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null // Reset to default (or true)
            });
            
            await replyMsg.edit({ embeds: [createEmbed(
                'Salon Déverrouillé',
                `${THEME.icons.success} Le salon <#${channel.id}> a été déverrouillé avec succès.`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.unlock_error', message.guild.id), 'error')] });
        }
    }
};
