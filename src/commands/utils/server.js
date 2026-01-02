const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'server',
    description: 'Commandes relatives au serveur',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        // --- OWNER: LIST ---
        if (sub === 'list') {
            if (!await isBotOwner(message.author.id)) return;
            
            const guilds = client.guilds.cache.map(g => `• ${g.name} | ${g.memberCount} membres | ID: ${g.id}`).join('\n');
            
            if (guilds.length > 1900) {
                 return sendV2Message(client, message.channel.id, (await t('server.list_title', message.guild.id, { count: client.guilds.cache.size })) + `\n${guilds.slice(0, 1900)}...`, []);
            }
            return sendV2Message(client, message.channel.id, (await t('server.list_title', message.guild.id, { count: client.guilds.cache.size })) + `\n${guilds}`, []);
        }

        if (sub === 'pic' || sub === 'icon') {
            const url = message.guild.iconURL({ size: 4096, extension: 'png' });
            if (!url) return sendV2Message(client, message.channel.id, await t('server.no_icon', message.guild.id), []);
            return sendV2Message(client, message.channel.id, (await t('server.icon_title', message.guild.id)) + `\n${url}`, []);
        }
        
        if (sub === 'banner') {
            const url = message.guild.bannerURL({ size: 4096, extension: 'png' });
            if (!url) return sendV2Message(client, message.channel.id, await t('server.no_banner', message.guild.id), []);
            return sendV2Message(client, message.channel.id, (await t('server.banner_title', message.guild.id)) + `\n${url}`, []);
        }

        return sendV2Message(client, message.channel.id, await t('server.usage', message.guild.id) + (await isBotOwner(message.author.id) ? ", `+server list`" : ""), []);
    }
};
