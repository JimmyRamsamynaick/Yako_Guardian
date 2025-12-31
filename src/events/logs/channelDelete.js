const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'channelDelete',
    async execute(client, channel) {
        if (!channel.guild) return;
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
        
        const description = `Le salon \`${channel.name}\` a été supprimé.`;
        const fields = [
            { name: 'Type', value: `${channel.type}`, inline: true },
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ];
        
        sendLog(channel.guild, '🗑️ Salon Supprimé', description, '#FF0000', fields, executor);
    }
};