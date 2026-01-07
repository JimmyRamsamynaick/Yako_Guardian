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
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function handleRoleMenuInteraction(client, interaction) {
    if (!interaction.guild) return;
    const { customId, guild, member } = interaction;
    const guildId = guild.id;

    // --- USER INTERACTION (Role Assignment) ---
    if (customId.startsWith('rm_user_')) {
        await handleUserInteraction(client, interaction);
        return;
    }

    // --- CONFIGURATION (Admin Only) ---
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ embeds: [createEmbed(await t('roles.handler.permission_denied', guildId), '', 'error')], ephemeral: true });
    }

    // Extract Menu ID if present (format: rolemenu_action_menuId)
    const parts = customId.split('_');
    const action = parts[1]; // edit, add, etc.
    
    if (action === 'dashboard') {
        const menuId = parts[2];
        const menu = await RoleMenu.findById(menuId);
        if (!menu) return interaction.update({ embeds: [createEmbed(await t('roles.handler.menu_not_found', guildId), '', 'error')], components: [] });
        await updateDashboard(client, interaction, menu);
    }
    else if (action === 'edit') {
        const target = parts[2]; // title, desc
        const menuId = parts[3];
        
        if (target === 'title') {
            const modal = new ModalBuilder()
                .setCustomId(`rolemenu_modal_title_${menuId}`)
                .setTitle(await t('roles.handler.modal_title_title', guildId));
            const input = new TextInputBuilder()
                .setCustomId('title')
                .setLabel(await t('roles.handler.modal_title_label', guildId))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (target === 'desc') {
            const modal = new ModalBuilder()
                .setCustomId(`rolemenu_modal_desc_${menuId}`)
                .setTitle(await t('roles.handler.modal_desc_title', guildId));
            const input = new TextInputBuilder()
                .setCustomId('desc')
                .setLabel(await t('roles.handler.modal_desc_label', guildId))
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
            .setTitle(await t('roles.handler.modal_option_title', guildId));
        
        const labelInput = new TextInputBuilder()
            .setCustomId('label')
            .setLabel(await t('roles.handler.modal_option_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel(await t('roles.handler.modal_option_emoji', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const roleInput = new TextInputBuilder()
            .setCustomId('role')
            .setLabel(await t('roles.handler.modal_option_role', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('desc')
            .setLabel(await t('roles.handler.modal_option_desc', guildId))
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
        if (!menu) return interaction.reply({ embeds: [createEmbed(await t('roles.handler.menu_not_found', guildId), '', 'error')], ephemeral: true });

        if (menu.options.length === 0) {
            return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_no_options', guildId), '', 'error')], ephemeral: true });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`rolemenu_select_del_${menuId}`)
            .setPlaceholder(await t('roles.handler.select_del_placeholder', guildId))
            .addOptions(
                menu.options.map((opt, i) => ({
                    label: opt.label,
                    description: opt.roleId,
                    value: i.toString(),
                    emoji: opt.emoji || undefined
                }))
            );
        
        await interaction.reply({ embeds: [createEmbed(await t('roles.handler.select_del_msg', guildId), '', 'info')], components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
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
            .setTitle(await t('roles.handler.modal_send_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel(await t('roles.handler.modal_send_channel', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'delete') {
        const menuId = parts[2];
        await RoleMenu.findByIdAndDelete(menuId);
        await interaction.update({ embeds: [createEmbed(await t('roles.handler.menu_deleted', guildId), '', 'success')], components: [] });
    }
    
    // --- MODAL SUBMITS ---
    else if (action === 'modal') {
        const sub = parts[2]; // title, desc, option, send
        const menuId = parts[3];
        const menu = await RoleMenu.findById(menuId);
        if (!menu) return interaction.reply({ embeds: [createEmbed(await t('roles.handler.menu_not_found', guildId), '', 'error')], ephemeral: true });

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
                return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_role_invalid', guildId), '', 'error')], ephemeral: true });
            }

            menu.options.push({ label, emoji, roleId, description: desc });
            await menu.save();
            await updateDashboard(client, interaction, menu);
        }
        else if (sub === 'send') {
            if (menu.options.length === 0) {
                return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_send_no_options', guildId), '', 'error')], ephemeral: true });
            }
            const channelId = interaction.fields.getTextInputValue('channel_id');
            const channel = guild.channels.cache.get(channelId);
            
            if (!channel || !channel.isTextBased()) {
                return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_channel_invalid', guildId), '', 'error')], ephemeral: true });
            }

            // Construct Message
            const content = `**${menu.title || await t('roles.rolemenu.default_title', guildId)}**\n\n${menu.description || ''}`;
            const components = [];

            if (menu.type === 'select') {
                const select = new StringSelectMenuBuilder()
                    .setCustomId(`rm_user_select_${menuId}`)
                    .setPlaceholder(await t('roles.handler.select_user_placeholder', guildId))
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
                const msg = await channel.send({ content: content, components: components });
                // V2 API returns the message object but properties might be slightly different.
                // Assuming msg.id is available.
                menu.channelId = channel.id;
                menu.messageId = msg.id;
                await menu.save();
                await interaction.reply({ embeds: [createEmbed(await t('roles.handler.menu_sent', guildId, { channel: `<#${channel.id}>` }), '', 'success')], ephemeral: true });
            } catch (e) {
                await interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_send', guildId, { error: e.message }), '', 'error')], ephemeral: true });
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
                
                await interaction.update({ embeds: [createEmbed(await t('roles.handler.option_deleted', guildId), '', 'success')], components: [] });
            }
        }
    }
}

async function updateDashboard(client, interaction, menu) {
    const guildId = interaction.guildId;
    const content = `**${await t('roles.handler.dashboard_title', guildId, { name: menu.name })}**\n` +
        `**${await t('roles.handler.btn_title', guildId)}:** ${menu.title || await t('roles.handler.dashboard_desc_none', guildId)}\n` +
        `**${await t('roles.handler.btn_desc', guildId)}:** ${menu.description ? (menu.description.substring(0, 50) + '...') : await t('roles.handler.dashboard_desc_none', guildId)}\n` +
        `**${await t('roles.handler.btn_type', guildId)}:** ${menu.type}\n` +
        `**${await t('roles.handler.dashboard_options', guildId)} (${menu.options.length}):**\n` +
        menu.options.map((o, i) => `> ${i+1}. ${o.emoji ? o.emoji + ' ' : ''}${o.label} (<@&${o.roleId}>)`).join('\n');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rolemenu_edit_title_${menu.id}`).setLabel(await t('roles.handler.btn_title', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rolemenu_edit_desc_${menu.id}`).setLabel(await t('roles.handler.btn_desc', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rolemenu_toggle_type_${menu.id}`).setLabel(`${await t('roles.handler.btn_type', guildId)}: ${menu.type}`).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rolemenu_add_option_${menu.id}`).setLabel(await t('roles.handler.btn_add_option', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rolemenu_del_option_${menu.id}`).setLabel(await t('roles.handler.btn_del_option', guildId)).setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rolemenu_send_${menu.id}`).setLabel(await t('roles.handler.btn_send', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rolemenu_delete_${menu.id}`).setLabel(await t('roles.handler.btn_delete', guildId)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`rolemenu_dashboard_${menu.id}`).setLabel(await t('roles.handler.btn_refresh', guildId)).setStyle(ButtonStyle.Secondary)
    );

    if (interaction.isMessageComponent && interaction.isMessageComponent() || interaction.isModalSubmit && interaction.isModalSubmit()) {
        await interaction.update({ embeds: [createEmbed(content, '', 'info')], components: [row1, row2, row3] });
    } else {
        await interaction.reply({ embeds: [createEmbed(content, '', 'info')], components: [row1, row2, row3] });
    }
}

async function handleUserInteraction(client, interaction) {
    const { customId, member, values, guild } = interaction;
    const guildId = guild.id;
    const parts = customId.split('_');
    const type = parts[2]; // select, btn
    const menuId = parts[3];

    const menu = await RoleMenu.findById(menuId);
    if (!menu) return interaction.reply({ embeds: [createEmbed(await t('roles.handler.menu_not_found', guildId), '', 'error')], ephemeral: true });

    if (type === 'select') {
        const selectedRoleIds = values;
        
        // Verify permissions for all selected options
        for (const roleId of selectedRoleIds) {
            const option = menu.options.find(o => o.roleId === roleId);
            if (option && option.requiredRoles && option.requiredRoles.length > 0) {
                const hasRequired = member.roles.cache.some(r => option.requiredRoles.includes(r.id));
                if (!hasRequired) {
                    return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_required_roles', guildId, { option: option.emoji || option.label }), '', 'error')], ephemeral: true });
                }
            }
        }

        const allMenuRoleIds = menu.options.map(o => o.roleId);
        const toAdd = selectedRoleIds;
        const toRemove = allMenuRoleIds.filter(id => !selectedRoleIds.includes(id));

        await member.roles.add(toAdd).catch(() => {});
        await member.roles.remove(toRemove).catch(() => {});

        await interaction.reply({ embeds: [createEmbed(await t('roles.handler.roles_updated', guildId), '', 'success')], ephemeral: true });
    }
    else if (type === 'btn') {
        const roleId = parts[4];
        const option = menu.options.find(o => o.roleId === roleId);

        if (option && option.requiredRoles && option.requiredRoles.length > 0) {
            const hasRequired = member.roles.cache.some(r => option.requiredRoles.includes(r.id));
            if (!hasRequired) {
                return interaction.reply({ embeds: [createEmbed(await t('roles.handler.error_required_roles', guildId), '', 'error')], ephemeral: true });
            }
        }

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({ embeds: [createEmbed(await t('roles.handler.role_removed', guildId, { role: `<@&${roleId}>` }), '', 'success')], ephemeral: true });
        } else {
            await member.roles.add(roleId);
            await interaction.reply({ embeds: [createEmbed(await t('roles.handler.role_added', guildId, { role: `<@&${roleId}>` }), '', 'success')], ephemeral: true });
        }
    }
}

module.exports = { handleRoleMenuInteraction, updateDashboard };
