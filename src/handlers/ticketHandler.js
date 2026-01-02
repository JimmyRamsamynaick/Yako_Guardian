const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../utils/componentUtils');
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const TicketConfig = require('../database/models/TicketConfig');
const ActiveTicket = require('../database/models/ActiveTicket');
const { t } = require('../utils/i18n');

// Handler for Ticket Settings Interactions
async function handleTicketSettings(client, interaction) {
    const { customId, guild } = interaction;
    const guildId = guild.id;
    const parts = customId.split('_');
    const action = parts[2]; // ticket_settings_action

    let config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config) config = await TicketConfig.create({ guildId: guild.id });

    if (action === 'category') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_category')
            .setTitle(await t('tickets.handler.modal_category_title', guildId));
        const input = new TextInputBuilder()
            .setCustomId('category_id')
            .setLabel(await t('tickets.handler.modal_category_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'transcript') {
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
}

async function updateTicketDashboard(client, interaction, config) {
    const guildId = interaction.guildId;
    const notDefined = await t('tickets.handler.dashboard_none', guildId);

    const content = `**${await t('tickets.handler.dashboard_title', guildId)}**\n\n` +
        `**${await t('tickets.handler.dashboard_category', guildId)}:** ${config.categoryId ? `<#${config.categoryId}>` : notDefined}\n` +
        `**${await t('tickets.handler.dashboard_transcript', guildId)}:** ${config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : notDefined}\n` +
        `**${await t('tickets.handler.dashboard_roles', guildId)}:** ${config.staffRoles.length > 0 ? config.staffRoles.map(r => `<@&${r}>`).join(', ') : await t('tickets.handler.dashboard_none_roles', guildId)}\n`;

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_category').setLabel(await t('tickets.handler.btn_set_category', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_transcript').setLabel(await t('tickets.handler.btn_set_transcript', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_role').setLabel(await t('tickets.handler.btn_manage_roles', guildId)).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_send').setLabel(await t('tickets.handler.btn_send_panel', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_settings_refresh').setLabel(await t('tickets.handler.btn_refresh', guildId)).setStyle(ButtonStyle.Secondary)
    );

    // If it's a real component interaction, update it
    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await updateV2Interaction(client, interaction, content, [row1, row2]);
    } 
    // If it's a Modal Submit, we also need to update (or reply if not deferrable easily)
    else if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        await updateV2Interaction(client, interaction, content, [row1, row2]);
    }
    // If it's a command (mock interaction)
    else {
        // Just send a new message
        await sendV2Message(client, interaction.channelId || interaction.channel.id, content, [row1, row2]);
    }
}

async function handleTicketModal(client, interaction) {
    const { customId, guild, fields } = interaction;
    const guildId = guild.id;
    let config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config) config = await TicketConfig.create({ guildId: guild.id });

    if (customId === 'ticket_modal_category') {
        const catId = fields.getTextInputValue('category_id');
        const channel = guild.channels.cache.get(catId);
        if (!channel || channel.type !== ChannelType.GuildCategory) {
            return replyV2Interaction(client, interaction, await t('tickets.handler.error_category_invalid', guildId), [], true);
        }
        config.categoryId = catId;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (customId === 'ticket_modal_transcript') {
        const chanId = fields.getTextInputValue('channel_id');
        const channel = guild.channels.cache.get(chanId);
        if (!channel || !channel.isTextBased()) {
            return replyV2Interaction(client, interaction, await t('tickets.handler.error_channel_invalid', guildId), [], true);
        }
        config.transcriptChannelId = chanId;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (customId === 'ticket_modal_role') {
        const roleId = fields.getTextInputValue('role_id');
        if (!guild.roles.cache.has(roleId)) {
            return replyV2Interaction(client, interaction, await t('tickets.handler.error_role_invalid', guildId), [], true);
        }
        if (config.staffRoles.includes(roleId)) {
            config.staffRoles = config.staffRoles.filter(r => r !== roleId);
        } else {
            config.staffRoles.push(roleId);
        }
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (customId === 'ticket_modal_send') {
        const chanId = fields.getTextInputValue('channel_id');
        const channel = guild.channels.cache.get(chanId);
        if (!channel || !channel.isTextBased()) {
            return replyV2Interaction(client, interaction, await t('tickets.handler.error_channel_invalid', guildId), [], true);
        }

        const btn = new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel(config.buttonLabel || await t('tickets.handler.panel_default_btn', guildId))
            .setEmoji(config.buttonEmoji || '📩')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(btn);
        
        await sendV2Message(client, chanId, `**${config.panelTitle || await t('tickets.handler.panel_default_title', guildId)}**\n${config.panelDescription || await t('tickets.handler.panel_default_desc', guildId)}`, [row]);
        
        await replyV2Interaction(client, interaction, await t('tickets.handler.panel_sent', guildId, { channel: `<#${chanId}>` }), [], true);
    }
}

async function handleTicketCreate(client, interaction) {
    const { guild, user } = interaction;
    const guildId = guild.id;
    
    // Defer immediately to prevent timeout during channel creation
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }

    const config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config || !config.categoryId) {
        return replyV2Interaction(client, interaction, await t('tickets.handler.error_not_configured', guildId), [], true);
    }

    config.ticketCount = (config.ticketCount || 0) + 1;
    await config.save();

    const channelName = config.namingScheme
        .replace('{username}', user.username)
        .replace('{count}', config.ticketCount);

    const permissionOverwrites = [
        {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles],
        },
        {
            id: client.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
        }
    ];

    if (config.staffRoles) {
        config.staffRoles.forEach(rId => {
            permissionOverwrites.push({
                id: rId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            });
        });
    }

    try {
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.categoryId,
            permissionOverwrites
        });

        await ActiveTicket.create({
            guildId: guild.id,
            channelId: channel.id,
            userId: user.id
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel(await t('tickets.handler.btn_close', guildId)).setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel(await t('tickets.handler.btn_claim', guildId)).setStyle(ButtonStyle.Secondary).setEmoji('🙋‍♂️')
        );

        await sendV2Message(client, channel.id, await t('tickets.handler.ticket_welcome', guildId, { user: `<@${user.id}>` }), [row]);

        await replyV2Interaction(client, interaction, await t('tickets.handler.ticket_created', guildId, { channel: `<#${channel.id}>` }), [], true);

    } catch (e) {
        console.error(e);
        await replyV2Interaction(client, interaction, await t('tickets.handler.error_creation', guildId), [], true);
    }
}

async function handleTicketClaim(client, interaction) {
    const { channel, user } = interaction;
    const guildId = interaction.guildId;
    
    // Defer just in case DB is slow
    if (!interaction.deferred && !interaction.replied) {
        // We reply publicly to announce claim
        await interaction.deferReply({ ephemeral: false });
    }

    const ticket = await ActiveTicket.findOne({ channelId: channel.id });
    
    if (!ticket) {
        return replyV2Interaction(client, interaction, await t('tickets.handler.error_ticket_inactive', guildId), [], true);
    }
    
    if (ticket.claimedBy) {
        return replyV2Interaction(client, interaction, await t('tickets.handler.error_already_claimed', guildId, { user: `<@${ticket.claimedBy}>` }), [], true);
    }
    
    ticket.claimedBy = user.id;
    await ticket.save();
    
    await replyV2Interaction(client, interaction, await t('tickets.handler.ticket_claimed', guildId, { user: `<@${user.id}>` }));
}

async function handleTicketClose(client, interaction) {
    const { channel, user, guild } = interaction;
    const guildId = guild.id;
    const ticket = await ActiveTicket.findOne({ channelId: channel.id });
    
    if (!ticket) {
        return replyV2Interaction(client, interaction, await t('tickets.handler.error_ticket_db', guildId), [], true);
    }

    await replyV2Interaction(client, interaction, await t('tickets.handler.ticket_closing', guildId));

    // Transcript Logic (simplified from close.js)
    let transcript = `${await t('tickets.handler.transcript_title', guildId)}\n`;
    transcript += `${await t('tickets.handler.transcript_id', guildId)}: ${ticket.channelId}\n`;
    transcript += `${await t('tickets.handler.transcript_creator', guildId)}: ${ticket.userId}\n`;
    transcript += `${await t('tickets.handler.transcript_closed_by', guildId)}: ${user.tag}\n`;
    transcript += `-------------------------\n\n`;

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        messages.reverse().forEach(m => {
            transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });
    } catch (e) {
        console.error("Error fetching messages for transcript:", e);
        transcript += `\n[${await t('tickets.handler.transcript_error', guildId)}]`;
    }

    const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${ticket.channelId}.txt` });

    // Send to transcript channel
    const config = await TicketConfig.findOne({ guildId: guild.id });
    if (config && config.transcriptChannelId) {
        const transChannel = guild.channels.cache.get(config.transcriptChannelId);
        if (transChannel) {
            await transChannel.send({
                content: `${await t('tickets.handler.transcript_embed_title', guildId)}\n${await t('tickets.handler.transcript_embed_desc', guildId, { channel: channel.name, user: `<@${user.id}>` })}`,
                files: [attachment]
            });
        }
    }

    // Delete active ticket entry
    await ActiveTicket.deleteOne({ channelId: channel.id });

    // Delete channel
    setTimeout(() => channel.delete().catch(() => {}), 5000);
}

module.exports = { 
    handleTicketSettings, 
    handleTicketModal, 
    handleTicketCreate, 
    handleTicketClaim,
    handleTicketClose,
    updateTicketDashboard 
};