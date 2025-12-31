const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {
        if (!message.guild || message.author?.bot) return;
        
        const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.id);
        
        const description = `Un message de ${message.author} a été supprimé dans ${message.channel}.`;
        
        const fields = [
            { name: 'Contenu', value: message.content ? message.content.substring(0, 1024) : '*Contenu vide ou média*' }
        ];

        if (message.attachments.size > 0) {
            fields.push({ name: 'Fichiers', value: `${message.attachments.size} fichiers` });
        }
        
        if (executor) {
            fields.push({ name: 'Supprimé par', value: `${executor.tag}` });
        }
        
        sendLog(message.guild, '🗑️ Message Supprimé', description, '#FF0000', fields, message.author);
    }
};