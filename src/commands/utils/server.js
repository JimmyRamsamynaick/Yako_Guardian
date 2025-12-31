const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'server',
    description: 'Commandes relatives au serveur (pic, banner)',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
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

        return sendV2Message(client, message.channel.id, "**Usage:** `+server pic` ou `+server banner`", []);
    }
};