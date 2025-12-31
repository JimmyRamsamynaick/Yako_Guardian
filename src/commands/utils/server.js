const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

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
                 return sendV2Message(client, message.channel.id, `**SERVEURS (${client.guilds.cache.size})**\n${guilds.slice(0, 1900)}...`, []);
            }
            return sendV2Message(client, message.channel.id, `**SERVEURS (${client.guilds.cache.size})**\n${guilds}`, []);
        }

        if (sub === 'pic' || sub === 'icon') {
            const url = message.guild.iconURL({ size: 4096, extension: 'png' });
            if (!url) return sendV2Message(client, message.channel.id, "❌ Ce serveur n'a pas d'icône.", []);
            return sendV2Message(client, message.channel.id, `**Icône du serveur**\n${url}`, []);
        }
        
        if (sub === 'banner') {
            const url = message.guild.bannerURL({ size: 4096, extension: 'png' });
            if (!url) return sendV2Message(client, message.channel.id, "❌ Ce serveur n'a pas de bannière.", []);
            return sendV2Message(client, message.channel.id, `**Bannière du serveur**\n${url}`, []);
        }

        return sendV2Message(client, message.channel.id, "**Usage:** `+server pic`, `+server banner`" + (await isBotOwner(message.author.id) ? ", `+server list`" : ""), []);
    }
};
