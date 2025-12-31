const { createPagination } = require('../../utils/pagination');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'rolemembers',
    description: 'Liste des membres ayant un rôle précis',
    category: 'Utils',
    async run(client, message, args) {
        const roleId = args[0]?.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        
        if (!role) {
            return sendV2Message(client, message.channel.id, "❌ Rôle introuvable.", []);
        }

        await message.guild.members.fetch();

        const members = role.members.map(m => m.user.tag);
        await createPagination(client, message, members, 10, `Membres avec le rôle ${role.name}`);
    }
};