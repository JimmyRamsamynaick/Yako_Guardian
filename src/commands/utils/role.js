const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'role',
    description: 'Informations détaillées sur un rôle',
    category: 'Utils',
    async run(client, message, args) {
        const roleId = args[0]?.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);

        if (!role) {
            return sendV2Message(client, message.channel.id, "❌ Rôle introuvable.", []);
        }

        const info = [
            `**Nom:** ${role.name}`,
            `**ID:** ${role.id}`,
            `**Couleur:** ${role.hexColor}`,
            `**Mentionable:** ${role.mentionable ? 'Oui' : 'Non'}`,
            `**Affiché séparément:** ${role.hoist ? 'Oui' : 'Non'}`,
            `**Position:** ${role.position}`,
            `**Membres:** ${role.members.size}`,
            `**Créé le:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`
        ].join('\n');

        await sendV2Message(client, message.channel.id, `**Info Rôle: ${role.name}**\n\n${info}`, []);
    }
};