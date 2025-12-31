const { sendLog } = require('../../utils/logManager');

module.exports = {
    name: 'messageUpdate',
    async execute(client, oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return; // Ignore embed updates
        
        const description = `Un message de ${newMessage.author} a été modifié dans ${newMessage.channel}.`;
        
        const fields = [
            { name: 'Ancien', value: oldMessage.content ? oldMessage.content.substring(0, 1024) : '*Vide*' },
            { name: 'Nouveau', value: newMessage.content ? newMessage.content.substring(0, 1024) : '*Vide*' },
            { name: 'Lien', value: `[Aller au message](${newMessage.url})` }
        ];
        
        sendLog(newMessage.guild, '✏️ Message Modifié', description, '#FFA500', fields, newMessage.author);
    }
};