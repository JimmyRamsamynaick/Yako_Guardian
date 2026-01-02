const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');
const { updateDashboard } = require('../../handlers/roleMenuHandler');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'rolemenu',
    description: 'Crée ou modifie un menu de rôles interactif',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('roles.rolemenu.permission_admin', message.guild.id), []);
        }

        const menuName = args[0];

        if (!menuName) {
            // List existing menus
            const menus = await RoleMenu.find({ guildId: message.guild.id });
            if (menus.length === 0) {
                return sendV2Message(client, message.channel.id, await t('roles.rolemenu.no_menus', message.guild.id), []);
            }
            const list = menus.map(m => `- **${m.name}** (ID: ${m.id})`).join('\n');
            return sendV2Message(client, message.channel.id, await t('roles.rolemenu.list_menus', message.guild.id, { list }), []);
        }

        let menu = await RoleMenu.findOne({ guildId: message.guild.id, name: menuName });
        
        if (!menu) {
            // Create new
            menu = await RoleMenu.create({
                guildId: message.guild.id,
                name: menuName,
                title: await t('roles.rolemenu.default_title', message.guild.id),
                description: await t('roles.rolemenu.default_description', message.guild.id),
                type: 'select',
                options: []
            });
        }

        // Launch Dashboard (via handler util to keep code DRY)
        // We mock an interaction-like object or just send message manually?
        // updateDashboard expects interaction. If we pass message, it won't work perfectly because update/reply differs.
        // I'll create a fake interaction wrapper or just send the message manually here using the same logic.
        
        // Better: Make updateDashboard handle "message" too?
        // Or just copy the initial send logic here.
        
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const content = await t('roles.rolemenu.dashboard_content', message.guild.id, {
            name: menu.name,
            title: menu.title || await t('common.not_defined', message.guild.id),
            description: menu.description ? (menu.description.substring(0, 50) + '...') : await t('common.not_defined', message.guild.id),
            type: menu.type,
            options_count: menu.options.length,
            options_list: menu.options.map((o, i) => `> ${i+1}. ${o.emoji ? o.emoji + ' ' : ''}${o.label} (<@&${o.roleId}>)`).join('\n')
        });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_edit_title_${menu.id}`).setLabel(await t('roles.rolemenu.btn_title', message.guild.id)).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rolemenu_edit_desc_${menu.id}`).setLabel(await t('roles.rolemenu.btn_description', message.guild.id)).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rolemenu_toggle_type_${menu.id}`).setLabel(await t('roles.rolemenu.btn_type', message.guild.id, { type: menu.type })).setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_add_option_${menu.id}`).setLabel(await t('roles.rolemenu.btn_add_option', message.guild.id)).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rolemenu_del_option_${menu.id}`).setLabel(await t('roles.rolemenu.btn_del_option', message.guild.id)).setStyle(ButtonStyle.Danger)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_send_${menu.id}`).setLabel(await t('roles.rolemenu.btn_send', message.guild.id)).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rolemenu_delete_${menu.id}`).setLabel(await t('roles.rolemenu.btn_delete', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`rolemenu_dashboard_${menu.id}`).setLabel(await t('roles.rolemenu.btn_refresh', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        return sendV2Message(client, message.channel.id, content, [row1, row2, row3]);
    }
};
