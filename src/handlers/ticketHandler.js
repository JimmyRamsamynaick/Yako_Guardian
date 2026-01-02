const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const TicketConfig = require('../database/models/TicketConfig');
const ActiveTicket = require('../database/models/ActiveTicket');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');

// --- TICKET SETTINGS HANDLER ---
async function handleTicketSettings(client, interaction) {
    const { customId, guild } = interaction;
    const guildId = guild.id;
    const parts = customId.split('_');
    const action = parts[2]; // ticket_settings_action

    let config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config) config = await TicketConfig.create({ guildId: guild.id });

    // --- MAIN DASHBOARD ACTIONS ---
    if (action === 'transcript') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_transcript')
            .setTitle(await t('tickets.handler.modal_transcript_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel(await t('tickets.handler.modal_transcript_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'role') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_role')
            .setTitle(await t('tickets.handler.modal_role_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel(await t('tickets.handler.modal_role_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'send') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_send')
            .setTitle(await t('tickets.handler.modal_send_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel(await t('tickets.handler.modal_send_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'refresh') {
        await updateTicketDashboard(client, interaction, config);
    }
    else if (action === 'addcat') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_addcat')
            .setTitle(await t('tickets.handler.modal_add_cat_title', guildId));
        
        const nameInput = new TextInputBuilder().setCustomId('cat_name').setLabel(await t('tickets.handler.modal_cat_name', guildId)).setStyle(TextInputStyle.Short).setRequired(true);
        const emojiInput = new TextInputBuilder().setCustomId('cat_emoji').setLabel(await t('tickets.handler.modal_cat_emoji', guildId)).setStyle(TextInputStyle.Short).setRequired(false);
        const parentInput = new TextInputBuilder().setCustomId('cat_parent').setLabel(await t('tickets.handler.modal_cat_parent', guildId)).setStyle(TextInputStyle.Short).setRequired(true);
        const rolesInput = new TextInputBuilder().setCustomId('cat_roles').setLabel(await t('tickets.handler.modal_cat_roles', guildId)).setStyle(TextInputStyle.Short).setRequired(false);
        const descInput = new TextInputBuilder().setCustomId('cat_desc').setLabel(await t('tickets.handler.modal_cat_desc', guildId)).setStyle(TextInputStyle.Paragraph).setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(emojiInput),
            new ActionRowBuilder().addComponents(parentInput),
            new ActionRowBuilder().addComponents(rolesInput),
            new ActionRowBuilder().addComponents(descInput)
        );
        await interaction.showModal(modal);
    }
    else if (action === 'delcat') {
        // If we have categories, show a select menu to delete? 
        // Or just a modal to type the name. Let's use a modal for simplicity or Select Menu if we can fit it in update.
        // Actually, let's use a Select Menu in the dashboard if possible, but for now let's use a modal to type name.
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_delcat')
            .setTitle(await t('tickets.handler.modal_del_cat_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('cat_name')
            .setLabel(await t('tickets.handler.modal_del_cat_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
}

// --- MODAL SUBMIT HANDLER ---
async function handleTicketModal(client, interaction) {
    const { customId, fields, guild } = interaction;
    const guildId = guild.id;
    const sub = customId.replace('ticket_modal_', '');

    let config = await TicketConfig.findOne({ guildId });
    if (!config) config = await TicketConfig.create({ guildId });

    if (sub === 'transcript') {
        const channelId = fields.getTextInputValue('channel_id');
        config.transcriptChannelId = channelId;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (sub === 'role') {
        const roles = fields.getTextInputValue('role_id').split(',').map(r => r.trim()).filter(r => r);
        config.staffRoles = roles;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (sub === 'addcat') {
        const name = fields.getTextInputValue('cat_name');
        const emoji = fields.getTextInputValue('cat_emoji');
        const parentId = fields.getTextInputValue('cat_parent');
        const roles = fields.getTextInputValue('cat_roles') ? fields.getTextInputValue('cat_roles').split(',').map(r => r.trim()) : [];
        const desc = fields.getTextInputValue('cat_desc');

        if (config.categories.length >= 25) {
             return interaction.reply({ embeds: [createEmbed(await t('tickets.handler.error_limit', guildId), '', 'error')], ephemeral: true });
        }

        config.categories.push({
            label: name,
            emoji: emoji,
            categoryId: parentId,
            staffRoles: roles,
            description: desc,
            style: 'Secondary'
        });
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (sub === 'delcat') {
        const name = fields.getTextInputValue('cat_name');
        const index = config.categories.findIndex(c => c.label.toLowerCase() === name.toLowerCase());
        if (index > -1) {
            config.categories.splice(index, 1);
            await config.save();
            await updateTicketDashboard(client, interaction, config);
        } else {
            await interaction.reply({ embeds: [createEmbed(await t('tickets.handler.cat_not_found', guildId), '', 'error')], ephemeral: true });
        }
    }
    else if (sub === 'send') {
        const channelId = fields.getTextInputValue('channel_id');
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return interaction.reply({ embeds: [createEmbed(await t('tickets.handler.error_channel_invalid', guildId), '', 'error')], ephemeral: true });

        // Create Panel
        const embed = createEmbed(
            config.panelTitle || await t('tickets.panel.title', guildId),
            config.panelDescription || await t('tickets.panel.description', guildId),
            'default'
        )
            .setColor(client.config.color || '#2b2d31')
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        // If categories exist, create a Select Menu or Buttons
        // If < 5 categories, buttons. If > 5, Select Menu.
        const components = [];

        if (config.categories && config.categories.length > 0) {
            if (config.categories.length <= 5) {
                const row = new ActionRowBuilder();
                config.categories.forEach((cat, index) => {
                    const btn = new ButtonBuilder()
                        .setCustomId(`ticket_create_${index}`)
                        .setLabel(cat.label)
                        .setStyle(ButtonStyle[cat.style || 'Secondary']);
                    if (cat.emoji) btn.setEmoji(cat.emoji);
                    row.addComponents(btn);
                });
                components.push(row);
            } else {
                const select = new StringSelectMenuBuilder()
                    .setCustomId('ticket_create_select')
                    .setPlaceholder(await t('tickets.panel.placeholder', guildId));
                
                config.categories.forEach((cat, index) => {
                    select.addOptions({
                        label: cat.label,
                        value: `cat_${index}`,
                        description: cat.description || '',
                        emoji: cat.emoji
                    });
                });
                components.push(new ActionRowBuilder().addComponents(select));
            }
        } else {
            // Default Button
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_default')
                    .setLabel(config.buttonLabel || await t('tickets.handler.panel_default_btn', guildId))
                    .setEmoji(config.buttonEmoji || '📩')
                    .setStyle(ButtonStyle.Primary)
            );
            components.push(row);
        }

        await channel.send({ embeds: [embed], components: components });
        await interaction.reply({ embeds: [createEmbed(await t('tickets.handler.panel_sent', guildId, { channel: channelId }), '', 'success')], ephemeral: true });
    }
}

// --- DASHBOARD UPDATER ---
async function updateTicketDashboard(client, interaction, config) {
    const guildId = interaction.guildId || interaction.guild.id;
    const notDefined = await t('tickets.handler.dashboard_none', guildId);

    // Helper to handle both MessageComponent and Command/Modal update
    const embed = createEmbed(await t('tickets.handler.dashboard_title', guildId), '', 'info');

    embed.addFields(
        { 
            name: await t('tickets.handler.dashboard_transcript', guildId), 
            value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : notDefined, 
            inline: true 
        },
        { 
            name: await t('tickets.handler.dashboard_roles', guildId), 
            value: (config.staffRoles && config.staffRoles.length > 0) ? config.staffRoles.map(r => `<@&${r}>`).join(', ') : await t('tickets.handler.dashboard_none_roles', guildId), 
            inline: true 
        }
    );

    let catList = "";
    if (config.categories && config.categories.length > 0) {
        config.categories.forEach(c => {
            catList += `- **${c.label}** (${c.categoryId ? `<#${c.categoryId}>` : 'Invalid'}) - Staff: ${c.staffRoles.length}\n`;
        });
    } else {
        catList = `*${await t('tickets.handler.dashboard_none', guildId)}*`;
    }

    embed.addFields({ name: await t('tickets.handler.dashboard_categories_title', guildId), value: catList, inline: false });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_addcat').setLabel(await t('tickets.handler.btn_add_cat', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_settings_delcat').setLabel(await t('tickets.handler.btn_del_cat', guildId)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_settings_refresh').setLabel(await t('tickets.handler.btn_refresh', guildId)).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_transcript').setLabel(await t('tickets.handler.btn_set_transcript', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_role').setLabel(await t('tickets.handler.btn_manage_roles', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_send').setLabel(await t('tickets.handler.btn_send_panel', guildId)).setStyle(ButtonStyle.Success)
    );

    const components = [row1, row2];

    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await interaction.update({ embeds: [embed], components: components, content: null });
    } 
    else if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        await interaction.update({ embeds: [embed], components: components, content: null });
    }
    else {
        // Mock interaction from command
        await interaction.channel.send({ embeds: [embed], components: components });
    }
}

// --- TICKET CREATION ---
async function handleTicketCreate(client, interaction) {
    const { customId, values, guild, user } = interaction;
    const guildId = guild.id;

    let config = await TicketConfig.findOne({ guildId });
    if (!config) return interaction.reply({ embeds: [createEmbed(await t('tickets.handler.error_not_configured', guildId), '', 'error')], ephemeral: true });

    let categoryConfig = null;
    
    // Determine Category
    if (customId === 'ticket_create_select') {
        const index = parseInt(values[0].replace('cat_', ''));
        categoryConfig = config.categories[index];
    } else if (customId.startsWith('ticket_create_')) {
        const suffix = customId.replace('ticket_create_', '');
        if (suffix === 'default') {
             // Fallback if no categories
        } else {
             const index = parseInt(suffix);
             categoryConfig = config.categories[index];
        }
    }

    // Determine Parent Category (Discord Channel Category)
    const parentId = categoryConfig ? categoryConfig.categoryId : config.categoryId;
    
    // Determine Staff Roles
    const staffRoles = categoryConfig && categoryConfig.staffRoles.length > 0 ? categoryConfig.staffRoles : config.staffRoles;

    // Increment count
    config.ticketCount += 1;
    await config.save();

    const ticketName = config.namingScheme.replace('{username}', user.username).replace('{count}', config.ticketCount);

    try {
        const ticketChannel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                },
                {
                    id: client.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
                },
                ...staffRoles.map(roleId => ({
                    id: roleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                }))
            ]
        });

        // Save to DB
        await ActiveTicket.create({
            guildId: guild.id,
            channelId: ticketChannel.id,
            userId: user.id,
            type: categoryConfig ? categoryConfig.label : 'Default'
        });

        // Send Welcome Message
        const embed = createEmbed(
            await t('tickets.panel.title', guildId),
            categoryConfig?.welcomeMessage || await t('tickets.handler.ticket_welcome', guildId, { user: user.toString() }),
            'default'
        )
            .setColor(client.config.color || '#2b2d31');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel(await t('tickets.handler.btn_close', guildId)).setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel(await t('tickets.handler.btn_claim', guildId)).setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️')
        );

        await ticketChannel.send({ content: `${user.toString()} ${staffRoles.map(r => `<@&${r}>`).join(' ')}`, embeds: [embed], components: [row] });

        await interaction.reply({ embeds: [createEmbed(await t('tickets.panel.created', guildId, { channel: ticketChannel.toString() }), '', 'success')], ephemeral: true });

    } catch (error) {
        console.error(error);
        await interaction.reply({ embeds: [createEmbed(await t('tickets.panel.error_create', guildId), '', 'error')], ephemeral: true });
    }
}

// --- TICKET ACTIONS ---
async function handleTicketClaim(client, interaction) {
    const { guild, user, channel } = interaction;
    const ticket = await ActiveTicket.findOne({ channelId: channel.id });
    if (!ticket) return interaction.reply({ embeds: [createEmbed(await t('tickets.handler.error_ticket_db', guild.id), '', 'error')], ephemeral: true });

    if (ticket.claimedBy) {
        return interaction.reply({ embeds: [createEmbed(await t('tickets.handler.error_already_claimed', guild.id, { user: `<@${ticket.claimedBy}>` }), '', 'error')], ephemeral: true });
    }

    ticket.claimedBy = user.id;
    await ticket.save();

    await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
    
    // Notify
    await interaction.reply({ embeds: [createEmbed(await t('tickets.handler.ticket_claimed', guild.id, { user: user.toString() }), '', 'success')] });
}

async function handleTicketClose(client, interaction) {
    const { guild, channel } = interaction;
    
    await interaction.reply({ embeds: [createEmbed(await t('tickets.handler.ticket_closing', guild.id), '', 'info')] });
    
    setTimeout(async () => {
        // Generate Transcript (Basic text file for now)
        // TODO: Advanced HTML Transcript
        
        await channel.delete().catch(() => {});
        await ActiveTicket.deleteOne({ channelId: channel.id });
    }, 5000);
}

module.exports = {
    handleTicketSettings,
    handleTicketModal,
    handleTicketCreate,
    handleTicketClaim,
    handleTicketClose,
    updateTicketDashboard
};