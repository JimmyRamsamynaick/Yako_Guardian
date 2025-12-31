const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'yako',
    description: 'Envoie l’invitation du serveur de support',
    category: 'Utils',
    async run(client, message, args) {
        await sendV2Message(client, message.channel.id, "**Serveur de Support Yako Guardian**\nhttps://discord.gg/jNxGyYGZgZ", []);
    }
};