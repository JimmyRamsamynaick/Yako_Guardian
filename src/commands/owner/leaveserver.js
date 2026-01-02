const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'leaveserver',
    description: 'Quitte un serveur (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const id = args[0];
        if (!id) return sendV2Message(client, message.channel.id, await t('leaveserver.missing_id', message.guild.id), []);

        const guild = client.guilds.cache.get(id);
        if (!guild) return sendV2Message(client, message.channel.id, await t('leaveserver.guild_not_found', message.guild.id), []);

        await guild.leave();
        return sendV2Message(client, message.channel.id, await t('leaveserver.success', message.guild.id, { name: guild.name, id: guild.id }), []);
    }
};