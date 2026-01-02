const { sendLog } = require('../../utils/logManager');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return; // Ignore embed updates
        
        const description = await t('logs.descriptions.message_update', newMessage.guild.id, { user: newMessage.author, channel: newMessage.channel });
        
        const fields = [
            { name: await t('logs.fields.old', newMessage.guild.id), value: oldMessage.content ? oldMessage.content.substring(0, 1024) : '*Vide*' },
            { name: await t('logs.fields.new', newMessage.guild.id), value: newMessage.content ? newMessage.content.substring(0, 1024) : '*Vide*' },
            { name: await t('logs.fields.link', newMessage.guild.id), value: await t('logs.fields.go_to_message', newMessage.guild.id, { url: newMessage.url }) }
        ];
        
        sendLog(newMessage.guild, await t('logs.titles.message_update', newMessage.guild.id), description, '#FFA500', fields, newMessage.author);
    }
};
