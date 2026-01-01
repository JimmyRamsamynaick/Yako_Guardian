const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');

module.exports = {
    name: 'restrict',
    description: 'Restreint une option de menu rôle à un rôle spécifique',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        // Try to find the target role (restriction) first
        let targetRole = message.mentions.roles.first();
        let query = "";

        // Remove the target role from args to get the query
        if (targetRole) {
            // Filter out the mention
            query = args.filter(a => !a.includes(targetRole.id)).join(' ');
        } else {
            // Try ID at the end
            const lastArg = args[args.length - 1];
            if (lastArg && lastArg.match(/^\d+$/)) {
                targetRole = message.guild.roles.cache.get(lastArg);
                if (targetRole) {
                    query = args.slice(0, -1).join(' ');
                }
            }
        }

        if (!targetRole || !query) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+restrict <NomOption/Emoji> <@RoleAutorisé>`\n\nExemple:\n`+restrict Jeux @Membre` (Seuls les @Membre peuvent prendre l'option 'Jeux')\n`+restrict 🛡️ @Staff`", []);
        }

        // Case insensitive regex for query
        const regex = new RegExp(`^${query}$`, 'i');

        // Search strategy:
        // 1. By Option Label (Case insensitive)
        // 2. By Option Emoji
        // 3. By Role ID given by the option (User might type the role name they want to restrict)
        
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
            // Try to help user by listing available options
            let helpMsg = `❌ Aucune option trouvée pour **"${query}"**.\n\n**Options disponibles :**\n`;
            let count = 0;
            for (const m of menus) {
                for (const o of m.options) {
                    if (count >= 10) break;
                    helpMsg += `• **${o.label}** ${o.emoji ? `(${o.emoji})` : ''} [Menu: ${m.name}]\n`;
                    count++;
                }
            }
            if (count === 0) helpMsg = "❌ Aucun menu/option configuré sur ce serveur.";
            
            return sendV2Message(client, message.channel.id, helpMsg, []);
        }

        // Apply restriction
        if (!foundMenu.options[foundOptionIndex].requiredRoles) {
            foundMenu.options[foundOptionIndex].requiredRoles = [];
        }

        if (!foundMenu.options[foundOptionIndex].requiredRoles.includes(targetRole.id)) {
            foundMenu.options[foundOptionIndex].requiredRoles.push(targetRole.id);
            await foundMenu.save();
        }

        return sendV2Message(client, message.channel.id, `✅ L'option **${foundMenu.options[foundOptionIndex].label}** est maintenant réservée au rôle **${targetRole.name}**.`, []);
    }
};