const TempRole = require('../../database/models/TempRole');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'untemprole',
    description: 'Retirer un rôle temporaire et annuler le timer',
    category: 'Rôles',
    async run(client, message, args) {
        // Permissions
        if (!message.member.permissions.has('ManageRoles') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission `Gérer les rôles`.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!member || !role) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+untemprole <@membre> <@role>`", []);
        }

        try {
            // Remove from DB
            const result = await TempRole.deleteOne({ 
                guild_id: message.guild.id, 
                user_id: member.id, 
                role_id: role.id 
            });

            // Remove role from user
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            }

            if (result.deletedCount > 0) {
                sendV2Message(client, message.channel.id, `✅ Rôle temporaire annulé et retiré pour ${member.user.tag}.`, []);
            } else {
                sendV2Message(client, message.channel.id, `⚠️ Ce membre n'avait pas ce rôle enregistré comme temporaire, mais je l'ai retiré s'il l'avait.`, []);
            }

        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, "❌ Erreur lors du retrait du rôle.", []);
        }
    }
};