const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'delperm',
    description: 'Supprime les permissions personnalisées d\'un rôle',
    category: 'Configuration',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return sendV2Message(client, message.channel.id, "Usage: `+delperm <@rôle>`", []);

        const config = await getGuildConfig(message.guild.id);
        const initialLen = config.customPermissions.length;
        config.customPermissions = config.customPermissions.filter(p => p.roleId !== role.id);
        
        if (config.customPermissions.length === initialLen) {
            return sendV2Message(client, message.channel.id, `ℹ️ Aucune permission trouvée pour **${role.name}**.`, []);
        }

        await config.save();
        sendV2Message(client, message.channel.id, `✅ Permissions supprimées pour le rôle **${role.name}**.`, []);
    }
};
