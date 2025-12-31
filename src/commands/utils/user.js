const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'user',
    description: 'Informations globales d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId);
        } catch {
            return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);
        }

        const info = [
            `**Tag:** ${user.tag}`,
            `**ID:** ${user.id}`,
            `**Création:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
            `**Bot:** ${user.bot ? 'Oui' : 'Non'}`
        ].join('\n');
        
        const links = [
            `[Avatar](${user.displayAvatarURL({ size: 1024 })})`,
            user.banner ? `[Bannière](${user.bannerURL({ size: 1024 })})` : null
        ].filter(Boolean).join(' | ');

        await sendV2Message(client, message.channel.id, `**Info Utilisateur: ${user.username}**\n\n${info}\n\n${links}`, []);
    }
};