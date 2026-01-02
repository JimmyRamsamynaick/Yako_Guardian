const { PermissionsBitField, ChannelType } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unhideall',
    description: 'Affiche tous les salons textuels du serveur',
    category: 'Moderation',
    usage: 'unhideall',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        let count = 0;

        await sendV2Message(client, message.channel.id, await t('moderation.unhideall_process', message.guild.id), []);

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

        return sendV2Message(client, message.channel.id, await t('moderation.unhideall_success', message.guild.id, { count }), []);
    }
};
