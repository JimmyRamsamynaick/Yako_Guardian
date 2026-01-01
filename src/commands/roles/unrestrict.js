const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');

module.exports = {
    name: 'unrestrict',
    description: 'Retire les restrictions sur une option de menu rôle',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const query = args.join(' ');

        if (!query) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+unrestrict <NomOption/Emoji>`\nExemple: `+unrestrict Jeux`", []);
        }

        // Case insensitive regex for query
        const regex = new RegExp(`^${query}$`, 'i');

        const menus = await RoleMenu.find({ guildId: message.guild.id });
        
        let foundMenu = null;
        let foundOptionIndex = -1;

        for (const menu of menus) {
            // Check options
            const index = menu.options.findIndex(o => 
                (o.label && o.label.match(regex)) || 
                (o.emoji && o.emoji === query) ||
                (o.roleId && o.roleId === query) // Direct ID match
            );

            if (index !== -1) {
                if (foundMenu) {
                    return sendV2Message(client, message.channel.id, `❌ Plusieurs options correspondent à **${query}**. Soyez plus précis.`, []);
                }
                foundMenu = menu;
                foundOptionIndex = index;
            }
        }

        if (!foundMenu) {
            return sendV2Message(client, message.channel.id, `❌ Aucune option trouvée pour **"${query}"**.`, []);
        }

        foundMenu.options[foundOptionIndex].requiredRoles = [];
        await foundMenu.save();

        return sendV2Message(client, message.channel.id, `✅ Restrictions retirées pour l'option **${foundMenu.options[foundOptionIndex].label}** du menu **${foundMenu.name}**.`, []);
    }
};