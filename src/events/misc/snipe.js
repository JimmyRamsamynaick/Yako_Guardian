module.exports = {
    name: 'messageDelete',
    execute(client, message) {
        if (message.partial || (message.content.length === 0 && message.attachments.size === 0)) return;
        
        client.snipes.set(message.channel.id, {
            content: message.content,
            author: message.author,
            image: message.attachments.first() ? message.attachments.first().proxyURL : null,
            date: new Date()
        });
    }
};