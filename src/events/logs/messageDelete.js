const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logUtils');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'messageDelete',
    async execute(client, message) {
        if (!message.guild || message.author?.bot) return;

        const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author?.id);
        const description = await t('logs.details.message_delete', message.guild.id, {
            user: message.author,
            channel: message.channel,
            content: message.content ? message.content : await t('logs.fields.empty', message.guild.id)
        });
        const deletedBy = await t('logs.fields.deleted_by', message.guild.id);

        await sendLog(message.guild, 'messageDelete', {
            description: description,
            footer: `Author: ${message.author.id} | Message ID: ${message.id}`,
            authorUser: message.author,
            executor: executor,
            fields: executor ? [{ name: deletedBy, value: `${executor} (${executor.tag})`, inline: true }] : []
        });
    }
};
