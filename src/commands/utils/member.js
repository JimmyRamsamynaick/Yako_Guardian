const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'member',
    description: 'Informations d’un membre sur le serveur',
    category: 'Utils',
    async run(client, message, args) {
        const memberId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let member;
        try {
            member = await message.guild.members.fetch(memberId);
        } catch {
            return sendV2Message(client, message.channel.id, "❌ Membre introuvable sur ce serveur.", []);
        }

        const info = [
            `**Surnom:** ${member.nickname || 'Aucun'}`,
            `**Rejoint le:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
            `**Boost depuis:** ${member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : 'Non'}`,
            `**Rôle le plus haut:** ${member.roles.highest}`,
            `**Rôles:** ${member.roles.cache.size - 1}` // Exclude @everyone
        ].join('\n');

        await sendV2Message(client, message.channel.id, `**Info Membre: ${member.user.tag}**\n\n${info}`, []);
    }
};