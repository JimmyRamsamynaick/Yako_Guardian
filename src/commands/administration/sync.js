const { sendV2Message } = require('../../utils/componentUtils');
const { ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'sync',
    description: 'Synchroniser les permissions d\'un salon avec sa catégorie',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('sync.permission', message.guild.id), []);
        }

        const target = args[0] ? args[0].toLowerCase() : 'channel'; // channel, category, all
        
        if (target === 'all') {
             // Sync ALL channels in the guild to their categories? Risky but requested.
             // Or maybe all channels in current category.
        }

        const channel = message.channel;

        if (!channel.parent) {
            return sendV2Message(client, message.channel.id, await t('sync.no_category', message.guild.id), []);
        }

        try {
            await channel.lockPermissions();
            sendV2Message(client, message.channel.id, await t('sync.success', message.guild.id, { category: channel.parent.name }), []);
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, await t('sync.error', message.guild.id), []);
        }
    }
};