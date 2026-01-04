const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return; // Ignore embed updates

        const description = await t('logs.details.message_edit', newMessage.guild.id, {
            channel: newMessage.channel,
            url: newMessage.url
        });
        const beforeLabel = await t('logs.fields.before', newMessage.guild.id);
        const afterLabel = await t('logs.fields.after', newMessage.guild.id);
        const emptyLabel = await t('logs.fields.empty', newMessage.guild.id);

        await sendLog(newMessage.guild, 'messageUpdate', {
            description: description,
            fields: [
                { name: beforeLabel, value: oldMessage.content ? oldMessage.content.substring(0, 1024) : emptyLabel, inline: false },
                { name: afterLabel, value: newMessage.content ? newMessage.content.substring(0, 1024) : emptyLabel, inline: false }
            ],
            footer: `Author: ${newMessage.author.id} | Message ID: ${newMessage.id}`,
            authorUser: newMessage.author
        });
    }
};
