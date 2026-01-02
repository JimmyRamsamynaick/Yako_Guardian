const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'globalset',
    description: 'Modifie le profil GLOBAL du bot (Owner uniquement)',
    category: 'Owner',
    aliases: ['gset'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const type = args[0]?.toLowerCase();
        const value = args.slice(1).join(' ');

        if (!type || !value) {
            return sendV2Message(client, message.channel.id, 
                await t('globalset.usage', message.guild.id), 
            []);
        }

        try {
            if (type === 'name') {
                await client.user.setUsername(value);
                return sendV2Message(client, message.channel.id, await t('globalset.name_changed', message.guild.id, { value }), []);
            } else if (['pic', 'avatar', 'pfp'].includes(type)) {
                await client.user.setAvatar(value);
                return sendV2Message(client, message.channel.id, await t('globalset.avatar_updated', message.guild.id), []);
            } else if (['banner'].includes(type)) {
                // Bots need to be verified/partnered? Not always, but usually tricky via API for normal bots?
                // Actually setBanner is not a method on client.user directly in v14?
                // It's typically done via the API or dashboard.
                // client.user.setBanner doesn't exist.
                return sendV2Message(client, message.channel.id, await t('globalset.banner_not_supported', message.guild.id), []);
            } else {
                return sendV2Message(client, message.channel.id, await t('globalset.invalid_option', message.guild.id), []);
            }
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('globalset.error', message.guild.id, { error: e.message }), []);
        }
    }
};
