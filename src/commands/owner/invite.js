const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'invite',
    description: 'Génère une invitation pour un serveur (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const id = args[0];
        if (!id) return sendV2Message(client, message.channel.id, await t('invite.missing_id', message.guild.id), []);

        const guild = client.guilds.cache.get(id);
        if (!guild) return sendV2Message(client, message.channel.id, await t('invite.guild_not_found', message.guild.id), []);

        // Try to find a channel to create invite
        const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        if (!channel) return sendV2Message(client, message.channel.id, await t('invite.create_error', message.guild.id), []);

        const invite = await channel.createInvite({ maxAge: 0, maxUses: 1 });
        return sendV2Message(client, message.channel.id, await t('invite.success', message.guild.id, { guildName: guild.name, url: invite.url }), []);
    }
};
