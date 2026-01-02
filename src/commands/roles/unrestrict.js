const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'unrestrict',
    description: 'Retire les restrictions sur une option de menu rôle',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('roles.unrestrict.permission', message.guild.id), []);
        }

        const query = args.join(' ');

        if (!query) {
            return sendV2Message(client, message.channel.id, await t('roles.unrestrict.usage', message.guild.id), []);
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
                    return sendV2Message(client, message.channel.id, await t('roles.unrestrict.multiple_matches', message.guild.id, { query: query }), []);
                }
                foundMenu = menu;
                foundOptionIndex = index;
            }
        }

        if (!foundMenu) {
            return sendV2Message(client, message.channel.id, await t('roles.unrestrict.no_option_found', message.guild.id, { query: query }), []);
        }

        foundMenu.options[foundOptionIndex].requiredRoles = [];
        await foundMenu.save();

        return sendV2Message(client, message.channel.id, await t('roles.unrestrict.success', message.guild.id, { option: foundMenu.options[foundOptionIndex].label, menu: foundMenu.name }), []);
    }
};