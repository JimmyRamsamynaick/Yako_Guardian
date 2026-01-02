const { createEmbed } = require('../../utils/design');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'sync',
    description: 'Synchroniser les permissions d\'un salon avec sa catégorie',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(
                await t('sync.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const target = args[0] ? args[0].toLowerCase() : 'channel'; // channel, category, all
        
        if (target === 'all') {
             // Sync ALL channels in the guild to their categories? Risky but requested.
             // Or maybe all channels in current category.
        }

        const channel = message.channel;

        if (!channel.parent) {
            return message.channel.send({ embeds: [createEmbed(
                await t('sync.no_category', message.guild.id),
                '',
                'warning'
            )] });
        }

        try {
            await channel.lockPermissions();
            return message.channel.send({ embeds: [createEmbed(
                await t('sync.success', message.guild.id, { category: channel.parent.name }),
                '',
                'success'
            )] });
        } catch (e) {
            console.error(e);
            return message.channel.send({ embeds: [createEmbed(
                await t('sync.error', message.guild.id),
                '',
                'error'
            )] });
        }
    }
};