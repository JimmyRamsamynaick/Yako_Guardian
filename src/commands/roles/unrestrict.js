const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'unrestrict',
    description: 'Retire les restrictions sur une option de menu rôle',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.unrestrict.permission', message.guild.id), '', 'error')] });
        }

        // Check for role mention to ignore
        let targetRole = message.mentions.roles.first();
        let query = "";

        if (targetRole) {
            query = args.filter(a => !a.includes(targetRole.id)).join(' ');
        } else {
            // Check for Role ID at the end
            const lastArg = args[args.length - 1];
            if (lastArg && lastArg.match(/^\d+$/)) {
                // Check if it's a role to be safe, though unrestrict doesn't need the role object
                // We just assume if it looks like an ID at the end, the user might be trying to pass a role ID
                // But wait, an option name could be a number.
                // Safest is to try to resolve it as a role.
                const potentialRole = message.guild.roles.cache.get(lastArg);
                if (potentialRole) {
                    query = args.slice(0, -1).join(' ');
                } else {
                    query = args.join(' ');
                }
            } else {
                query = args.join(' ');
            }
        }

        if (!query) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.unrestrict.usage', message.guild.id), '', 'error')] });
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
                    return message.channel.send({ embeds: [createEmbed(await t('roles.unrestrict.multiple_matches', message.guild.id, { query: query }), '', 'error')] });
                }
                foundMenu = menu;
                foundOptionIndex = index;
            }
        }

        if (!foundMenu) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.unrestrict.no_option_found', message.guild.id, { query: query }), '', 'error')] });
        }

        foundMenu.options[foundOptionIndex].requiredRoles = [];
        await foundMenu.save();

        return message.channel.send({ embeds: [createEmbed(await t('roles.unrestrict.success', message.guild.id, { option: foundMenu.options[foundOptionIndex].label, menu: foundMenu.name }), '', 'success')] });
    }
};