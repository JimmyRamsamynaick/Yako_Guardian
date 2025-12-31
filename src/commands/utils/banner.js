const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'banner',
    description: 'Récupère la bannière d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId, { force: true }); 
        } catch {
            return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);
        }

        if (!user.banner) {
             return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'a pas de bannière.", []);
        }

        const url = user.bannerURL({ size: 4096, extension: 'png' });
        await sendV2Message(client, message.channel.id, `**Bannière de ${user.tag}**\n${url}`, []);
    }
};