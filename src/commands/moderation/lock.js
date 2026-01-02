const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'lock',
    description: 'Verrouille un salon (empêche @everyone de parler)',
    category: 'Moderation',
    usage: 'lock [channel]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Lock', `${THEME.icons.loading} Verrouillage du salon...`, 'loading')] });

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });
            
            await replyMsg.edit({ embeds: [createEmbed(
                'Salon Verrouillé',
                `${THEME.icons.success} Le salon <#${channel.id}> a été verrouillé avec succès.`,
                'success'
            )] });
        } catch (err) {
            console.error(err);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('moderation.lock_error', message.guild.id), 'error')] });
        }
    }
};
