const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const RoleMenu = require('../../database/models/RoleMenu');
const { updateDashboard } = require('../../handlers/roleMenuHandler');

module.exports = {
    name: 'rolemenu',
    description: 'Crée ou modifie un menu de rôles interactif',
    category: 'Roles',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const menuName = args[0];

        if (!menuName) {
            // List existing menus
            const menus = await RoleMenu.find({ guildId: message.guild.id });
            if (menus.length === 0) {
                return sendV2Message(client, message.channel.id, "ℹ️ Aucun menu de rôle. Créez-en un avec `+rolemenu <nom>`.", []);
            }
            const list = menus.map(m => `- **${m.name}** (ID: ${m.id})`).join('\n');
            return sendV2Message(client, message.channel.id, `**Menus existants:**\n${list}\n\nUtilisez \`+rolemenu <nom>\` pour éditer/créer.`, []);
        }

        let menu = await RoleMenu.findOne({ guildId: message.guild.id, name: menuName });
        
        if (!menu) {
            // Create new
            menu = await RoleMenu.create({
                guildId: message.guild.id,
                name: menuName,
                title: 'Titre du Menu',
                description: 'Description du Menu',
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
        
        const content = `**🛠️ Configuration RoleMenu: ${menu.name}**\n` +
            `**Titre:** ${menu.title || 'Non défini'}\n` +
            `**Description:** ${menu.description ? (menu.description.substring(0, 50) + '...') : 'Non définie'}\n` +
            `**Type:** ${menu.type}\n` +
            `**Options (${menu.options.length}):**\n` +
            menu.options.map((o, i) => `> ${i+1}. ${o.emoji ? o.emoji + ' ' : ''}${o.label} (<@&${o.roleId}>)`).join('\n');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_edit_title_${menu.id}`).setLabel('Titre').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rolemenu_edit_desc_${menu.id}`).setLabel('Description').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rolemenu_toggle_type_${menu.id}`).setLabel(`Type: ${menu.type}`).setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_add_option_${menu.id}`).setLabel('Ajouter Option').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rolemenu_del_option_${menu.id}`).setLabel('Supprimer Option').setStyle(ButtonStyle.Danger)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rolemenu_send_${menu.id}`).setLabel('Envoyer le Menu').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rolemenu_delete_${menu.id}`).setLabel('Supprimer le Menu').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`rolemenu_dashboard_${menu.id}`).setLabel('Rafraîchir').setStyle(ButtonStyle.Secondary)
        );

        return sendV2Message(client, message.channel.id, content, [row1, row2, row3]);
    }
};
