const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionsBitField
} = require('discord.js');
const RoleMenu = require('../database/models/RoleMenu');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../utils/componentUtils');

async function handleRoleMenuInteraction(client, interaction) {
    const { customId, guild, member } = interaction;

    // --- USER INTERACTION (Role Assignment) ---
    if (customId.startsWith('rm_user_')) {
        await handleUserInteraction(client, interaction);
        return;
    }

    // --- CONFIGURATION (Admin Only) ---
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return replyV2Interaction(client, interaction, "❌ Permission `Administrateur` requise.", [], true);
    }

    // Extract Menu ID if present (format: rolemenu_action_menuId)
    const parts = customId.split('_');
    const action = parts[1]; // edit, add, etc.
    
    if (action === 'dashboard') {
        const menuId = parts[2];
        const menu = await RoleMenu.findById(menuId);
        if (!menu) return updateV2Interaction(client, interaction, "❌ Menu introuvable.", []);
        await updateDashboard(client, interaction, menu);
    }
    else if (action === 'edit') {
        const target = parts[2]; // title, desc
        const menuId = parts[3];
        
        if (target === 'title') {
            const modal = new ModalBuilder()
                .setCustomId(`rolemenu_modal_title_${menuId}`)
                .setTitle("Modifier le titre");
            const input = new TextInputBuilder()
                .setCustomId('title')
                .setLabel("Nouveau titre")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (target === 'desc') {
            const modal = new ModalBuilder()
                .setCustomId(`rolemenu_modal_desc_${menuId}`)
                .setTitle("Modifier la description");
            const input = new TextInputBuilder()
                .setCustomId('desc')
                .setLabel("Nouvelle description")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }
    else if (action === 'add') {
        const menuId = parts[3]; // rolemenu_add_option_<menuId>
        const modal = new ModalBuilder()
            .setCustomId(`rolemenu_modal_option_${menuId}`)
            .setTitle("Ajouter une option");
        
        const labelInput = new TextInputBuilder()
            .setCustomId('label')
            .setLabel("Label (Nom)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel("Emoji (Optionnel)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const roleInput = new TextInputBuilder()
            .setCustomId('role')
            .setLabel("ID du Rôle")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('desc')
            .setLabel("Description (Optionnel)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(emojiInput),
            new ActionRowBuilder().addComponents(roleInput),
            new ActionRowBuilder().addComponents(descInput)
        );
        await interaction.showModal(modal);
    }
    else if (action === 'del') {
        const menuId = parts[3]; // rolemenu_del_option_<menuId>
        const menu = await RoleMenu.findById(menuId);
        if (!menu) return replyV2Interaction(client, interaction, "Menu introuvable.", [], true);

        if (menu.options.length === 0) {
            return replyV2Interaction(client, interaction, "Aucune option à supprimer.", [], true);
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`rolemenu_select_del_${menuId}`)
            .setPlaceholder("Choisir l'option à supprimer")
            .addOptions(
                menu.options.map((opt, i) => ({
                    label: opt.label,
                    description: opt.roleId,
                    value: i.toString(),
                    emoji: opt.emoji || undefined
                }))
            );
        
        await replyV2Interaction(client, interaction, "Choisissez l'option à supprimer :", [new ActionRowBuilder().addComponents(select)], true);
    }
    else if (action === 'toggle') {
        const menuId = parts[3]; // rolemenu_toggle_type_<menuId>
        const menu = await RoleMenu.findById(menuId);
        menu.type = menu.type === 'select' ? 'button' : 'select';
        await menu.save();
        await updateDashboard(client, interaction, menu);
    }
    else if (action === 'send') {
        const menuId = parts[2];
        const modal = new ModalBuilder()
            .setCustomId(`rolemenu_modal_send_${menuId}`)
            .setTitle("Envoyer le menu");
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel("ID du Salon")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'delete') {
        const menuId = parts[2];
        await RoleMenu.findByIdAndDelete(menuId);
        await updateV2Interaction(client, interaction, "✅ Menu supprimé avec succès.", []);
    }
    
    // --- MODAL SUBMITS ---
    else if (action === 'modal') {
        const sub = parts[2]; // title, desc, option, send
        const menuId = parts[3];
        const menu = await RoleMenu.findById(menuId);
        if (!menu) return replyV2Interaction(client, interaction, "Menu introuvable.", [], true);

        if (sub === 'title') {
            menu.title = interaction.fields.getTextInputValue('title');
            await menu.save();
            await updateDashboard(client, interaction, menu);
        }
        else if (sub === 'desc') {
            menu.description = interaction.fields.getTextInputValue('desc');
            await menu.save();
            await updateDashboard(client, interaction, menu);
        }
        else if (sub === 'option') {
            const label = interaction.fields.getTextInputValue('label');
            const emoji = interaction.fields.getTextInputValue('emoji');
            const roleId = interaction.fields.getTextInputValue('role');
            const desc = interaction.fields.getTextInputValue('desc');

            // Verify role
            if (!guild.roles.cache.has(roleId)) {
                return replyV2Interaction(client, interaction, "❌ ID de rôle invalide.", [], true);
            }

            menu.options.push({ label, emoji, roleId, description: desc });
            await menu.save();
            await updateDashboard(client, interaction, menu);
        }
        else if (sub === 'send') {
            if (menu.options.length === 0) {
                return replyV2Interaction(client, interaction, "❌ Vous devez ajouter au moins une option avant d'envoyer le menu.", [], true);
            }
            const channelId = interaction.fields.getTextInputValue('channel_id');
            const channel = guild.channels.cache.get(channelId);
            
            if (!channel || !channel.isTextBased()) {
                return replyV2Interaction(client, interaction, "❌ Salon invalide.", [], true);
            }

            // Construct Message
            const content = `**${menu.title || 'Role Menu'}**\n\n${menu.description || ''}`;
            const components = [];

            if (menu.type === 'select') {
                const select = new StringSelectMenuBuilder()
                    .setCustomId(`rm_user_select_${menuId}`)
                    .setPlaceholder("Sélectionnez vos rôles")
                    .setMinValues(0) // Allow clearing
                    .setMaxValues(menu.options.length);

                select.addOptions(menu.options.map(opt => ({
                    label: opt.label,
                    description: opt.description || undefined,
                    value: opt.roleId,
                    emoji: opt.emoji || undefined
                })));
                components.push(new ActionRowBuilder().addComponents(select));
            } else {
                // Buttons
                const rows = [];
                let currentRow = new ActionRowBuilder();
                menu.options.forEach((opt, i) => {
                    if (i > 0 && i % 5 === 0) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                    }
                    currentRow.addComponents(
                        (() => {
                            const btn = new ButtonBuilder()
                                .setCustomId(`rm_user_btn_${menuId}_${opt.roleId}`)
                                .setLabel(opt.label)
                                .setStyle(ButtonStyle.Secondary);
                            if (opt.emoji) btn.setEmoji(opt.emoji);
                            return btn;
                        })()
                    );
                });
                rows.push(currentRow);
                components.push(...rows);
            }

            try {
                const msg = await sendV2Message(client, channel.id, content, components);
                // V2 API returns the message object but properties might be slightly different.
                // Assuming msg.id is available.
                menu.channelId = channel.id;
                menu.messageId = msg.id;
                await menu.save();
                await replyV2Interaction(client, interaction, `✅ Menu envoyé dans <#${channel.id}> !`, [], true);
            } catch (e) {
                await replyV2Interaction(client, interaction, `❌ Erreur d'envoi: ${e.message}`, [], true);
            }
        }
    }
    
    // --- SELECT SUBMITS ---
    else if (action === 'select') {
        const sub = parts[2]; // del
        const menuId = parts[3];
        
        if (sub === 'del') {
            const index = parseInt(interaction.values[0]);
            const menu = await RoleMenu.findById(menuId);
            if (menu) {
                menu.options.splice(index, 1);
                await menu.save();
                
                await updateV2Interaction(client, interaction, "✅ Option supprimée.", []);
            }
        }
    }
}

async function updateDashboard(client, interaction, menu) {
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

    if (interaction.isMessageComponent && interaction.isMessageComponent() || interaction.isModalSubmit && interaction.isModalSubmit()) {
        await updateV2Interaction(client, interaction, content, [row1, row2, row3]);
    } else {
        await replyV2Interaction(client, interaction, content, [row1, row2, row3]);
    }
}

async function handleUserInteraction(client, interaction) {
    const { customId, member, values, guild } = interaction;
    const parts = customId.split('_');
    const type = parts[2]; // select, btn
    const menuId = parts[3];

    const menu = await RoleMenu.findById(menuId);
    if (!menu) return replyV2Interaction(client, interaction, "❌ Ce menu n'existe plus.", [], true);

    if (type === 'select') {
        const selectedRoleIds = values;
        
        // Verify permissions for all selected options
        for (const roleId of selectedRoleIds) {
            const option = menu.options.find(o => o.roleId === roleId);
            if (option && option.requiredRoles && option.requiredRoles.length > 0) {
                const hasRequired = member.roles.cache.some(r => option.requiredRoles.includes(r.id));
                if (!hasRequired) {
                    return replyV2Interaction(client, interaction, `🔒 Vous n'avez pas les rôles requis pour l'option ${option.emoji || option.label}.`, [], true);
                }
            }
        }

        const allMenuRoleIds = menu.options.map(o => o.roleId);
        const toAdd = selectedRoleIds;
        const toRemove = allMenuRoleIds.filter(id => !selectedRoleIds.includes(id));

        await member.roles.add(toAdd).catch(() => {});
        await member.roles.remove(toRemove).catch(() => {});

        await replyV2Interaction(client, interaction, "✅ Rôles mis à jour !", [], true);
    }
    else if (type === 'btn') {
        const roleId = parts[4];
        const option = menu.options.find(o => o.roleId === roleId);

        if (option && option.requiredRoles && option.requiredRoles.length > 0) {
            const hasRequired = member.roles.cache.some(r => option.requiredRoles.includes(r.id));
            if (!hasRequired) {
                return replyV2Interaction(client, interaction, "🔒 Vous n'avez pas les rôles requis pour cette option.", [], true);
            }
        }

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await replyV2Interaction(client, interaction, `➖ Rôle <@&${roleId}> retiré.`, [], true);
        } else {
            await member.roles.add(roleId);
            await replyV2Interaction(client, interaction, `➕ Rôle <@&${roleId}> ajouté.`, [], true);
        }
    }
}

module.exports = { handleRoleMenuInteraction, updateDashboard };
