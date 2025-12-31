const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'channelCreate',
    async execute(client, channel) {
        if (!channel.guild) return;
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        
        const description = `Le salon ${channel} (\`${channel.name}\`) a été créé.`;
        const fields = [
            { name: 'Type', value: `${channel.type}`, inline: true },
            { name: 'Catégorie', value: channel.parent ? channel.parent.name : 'Aucune', inline: true },
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ];
        
        sendLog(channel.guild, '📺 Salon Créé', description, '#00FF00', fields, executor);
    }
};