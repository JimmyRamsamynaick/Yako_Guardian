const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {
        if (!message.guild || message.author?.bot) return;
        
        const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.id);
        
        const description = await t('logs.descriptions.message_delete', message.guild.id, { user: message.author, channel: message.channel });
        
        const fields = [
            { name: await t('logs.fields.content', message.guild.id), value: message.content ? message.content.substring(0, 1024) : await t('logs.fields.empty_content', message.guild.id) }
        ];

        if (message.attachments.size > 0) {
            fields.push({ name: await t('logs.fields.files', message.guild.id), value: `${message.attachments.size} fichiers` });
        }
        
        if (executor) {
            fields.push({ name: await t('logs.fields.deleted_by', message.guild.id), value: `${executor.tag}` });
        }
        
        sendLog(message.guild, await t('logs.titles.message_delete', message.guild.id), description, '#FF0000', fields, message.author);
    }
};
