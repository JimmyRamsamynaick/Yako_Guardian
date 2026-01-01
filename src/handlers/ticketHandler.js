const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../utils/componentUtils');
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const TicketConfig = require('../database/models/TicketConfig');
const ActiveTicket = require('../database/models/ActiveTicket');

// Handler for Ticket Settings Interactions
async function handleTicketSettings(client, interaction) {
    const { customId, guild } = interaction;
    const parts = customId.split('_');
    const action = parts[2]; // ticket_settings_action

    let config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config) config = await TicketConfig.create({ guildId: guild.id });

    if (action === 'category') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_category')
            .setTitle('Définir la Catégorie');
        const input = new TextInputBuilder()
            .setCustomId('category_id')
            .setLabel('ID de la Catégorie')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'transcript') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_transcript')
            .setTitle('Canal de Transcripts');
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('ID du Salon')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'role') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_role')
            .setTitle('Ajouter/Retirer Rôle Staff');
        const input = new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('ID du Rôle')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (action === 'send') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_send')
            .setTitle('Envoyer le Panel');
        const input = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('ID du Salon')
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
    const content = `**🎟️ Configuration Tickets**\n\n` +
        `**Catégorie:** ${config.categoryId ? `<#${config.categoryId}>` : 'Non définie'}\n` +
        `**Transcripts:** ${config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : 'Non défini'}\n` +
        `**Rôles Staff:** ${config.staffRoles.length > 0 ? config.staffRoles.map(r => `<@&${r}>`).join(', ') : 'Aucun'}\n`;

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_category').setLabel('Définit Catégorie').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_transcript').setLabel('Définit Transcripts').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_settings_role').setLabel('Gérer Rôles Staff').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_settings_send').setLabel('Envoyer Panel').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_settings_refresh').setLabel('Rafraîchir').setStyle(ButtonStyle.Secondary)
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
    let config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config) config = await TicketConfig.create({ guildId: guild.id });

    if (customId === 'ticket_modal_category') {
        const catId = fields.getTextInputValue('category_id');
        const channel = guild.channels.cache.get(catId);
        if (!channel || channel.type !== ChannelType.GuildCategory) {
            return replyV2Interaction(client, interaction, "❌ ID de catégorie invalide.", [], true);
        }
        config.categoryId = catId;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (customId === 'ticket_modal_transcript') {
        const chanId = fields.getTextInputValue('channel_id');
        const channel = guild.channels.cache.get(chanId);
        if (!channel || !channel.isTextBased()) {
            return replyV2Interaction(client, interaction, "❌ Salon invalide.", [], true);
        }
        config.transcriptChannelId = chanId;
        await config.save();
        await updateTicketDashboard(client, interaction, config);
    }
    else if (customId === 'ticket_modal_role') {
        const roleId = fields.getTextInputValue('role_id');
        if (!guild.roles.cache.has(roleId)) {
            return replyV2Interaction(client, interaction, "❌ Rôle invalide.", [], true);
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
            return replyV2Interaction(client, interaction, "❌ Salon invalide.", [], true);
        }

        const btn = new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel(config.buttonLabel || 'Ouvrir un ticket')
            .setEmoji(config.buttonEmoji || '📩')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(btn);
        
        await sendV2Message(client, chanId, `**${config.panelTitle || 'Support Ticket'}**\n${config.panelDescription || 'Cliquez sur le bouton ci-dessous pour ouvrir un ticket.'}`, [row]);
        
        await replyV2Interaction(client, interaction, `✅ Panel envoyé dans <#${chanId}>.`, [], true);
    }
}

async function handleTicketCreate(client, interaction) {
    const { guild, user } = interaction;
    
    // Defer immediately to prevent timeout during channel creation
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }

    const config = await TicketConfig.findOne({ guildId: guild.id });
    if (!config || !config.categoryId) {
        return replyV2Interaction(client, interaction, "❌ Le système de tickets n'est pas configuré (Catégorie manquante).", [], true);
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
            new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋‍♂️')
        );

        await sendV2Message(client, channel.id, `👋 Bonjour <@${user.id}> ! Un membre du staff va s'occuper de vous.\n\nUtilisez les boutons ou les commandes \`+close\`, \`+claim\`.`, [row]);

        await replyV2Interaction(client, interaction, `✅ Ticket créé : <#${channel.id}>`, [], true);

    } catch (e) {
        console.error(e);
        await replyV2Interaction(client, interaction, "❌ Erreur lors de la création du ticket.", [], true);
    }
}

async function handleTicketClaim(client, interaction) {
    const { channel, user } = interaction;
    
    // Defer just in case DB is slow
    if (!interaction.deferred && !interaction.replied) {
        // We reply publicly to announce claim
        await interaction.deferReply({ ephemeral: false });
    }

    const ticket = await ActiveTicket.findOne({ channelId: channel.id });
    
    if (!ticket) {
        return replyV2Interaction(client, interaction, "❌ Ce ticket n'est plus actif.", [], true);
    }
    
    if (ticket.claimedBy) {
        return replyV2Interaction(client, interaction, `❌ Déjà pris en charge par <@${ticket.claimedBy}>.`, [], true);
    }
    
    ticket.claimedBy = user.id;
    await ticket.save();
    
    await replyV2Interaction(client, interaction, `🙋‍♂️ **Ticket pris en charge par** <@${user.id}>.`);
}

async function handleTicketClose(client, interaction) {
    const { channel, user, guild } = interaction;
    const ticket = await ActiveTicket.findOne({ channelId: channel.id });
    
    if (!ticket) {
        return replyV2Interaction(client, interaction, "❌ Ticket introuvable en base de données.", [], true);
    }

    await replyV2Interaction(client, interaction, "🔒 Fermeture du ticket dans 5 secondes...");

    // Transcript Logic (simplified from close.js)
    let transcript = `TRANSCRIPT DU TICKET\n`;
    transcript += `ID: ${ticket.channelId}\n`;
    transcript += `Créateur: ${ticket.userId}\n`;
    transcript += `Fermé par: ${user.tag}\n`;
    transcript += `-------------------------\n\n`;

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        messages.reverse().forEach(m => {
            transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });
    } catch (e) {
        console.error("Error fetching messages for transcript:", e);
        transcript += "\n[Erreur lors de la récupération des messages]";
    }

    const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `transcript-${ticket.channelId}.txt` });

    // Send to transcript channel
    const config = await TicketConfig.findOne({ guildId: guild.id });
    if (config && config.transcriptChannelId) {
        const transChannel = guild.channels.cache.get(config.transcriptChannelId);
        if (transChannel) {
            await transChannel.send({
                content: `📕 **Ticket Fermé**\nTicket: ${channel.name}\nFermé par: <@${user.id}>`,
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