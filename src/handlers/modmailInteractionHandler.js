const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { createTicket } = require('../utils/modmailUtils');
const { updateV2Interaction, replyV2Interaction, sendV2Message } = require('../utils/componentUtils');

async function handleModmailInteraction(client, interaction) {
    const { customId, guild } = interaction;

    // Report Logic (Settings)
    if (customId.startsWith('report_')) {
        // Modal Submit
        if (customId.startsWith('report_modal_')) {
            await handleReportModal(client, interaction);
            return;
        }

        const config = await getGuildConfig(guild.id);
        if (customId === 'report_toggle') {
            config.report.enabled = !config.report.enabled;
            await config.save();
            await showReportMenu(client, interaction, config);
        } else if (customId === 'report_channel_select') {
            config.report.channelId = interaction.values[0];
            await config.save();
            await showReportMenu(client, interaction, config);
        }
        return;
    }

    // User Side (DM)
    if (customId === 'modmail_select_guild') {
        const guildId = interaction.values[0];
        const targetGuild = client.guilds.cache.get(guildId);
        
        if (!targetGuild) return replyV2Interaction(client, interaction, "❌ Serveur introuvable.", [], true);

        try {
            await createTicket(client, interaction.user, targetGuild, "Ticket créé via menu de sélection.");
            // Update the menu to show success, or just reply?
            // Original code updated content.
            await updateV2Interaction(client, interaction, `✅ **Ticket ouvert sur ${targetGuild.name} !**`, []);
        } catch (e) {
            await replyV2Interaction(client, interaction, `❌ Erreur: ${e.message}`, [], true);
        }
        return;
    }

    // Modmail Close Button
    if (customId === 'modmail_close') {
        const ActiveTicket = require('../database/models/ActiveTicket');
        const ticket = await ActiveTicket.findOne({ channelId: interaction.channelId });
        if (ticket) {
            ticket.closed = true;
            await ticket.save();
            await interaction.channel.delete().catch(() => {});
            
            // Notify user?
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            if (user) user.send(`🔒 Votre ticket sur **${interaction.guild.name}** a été fermé par le staff.`).catch(() => {});
        } else {
            replyV2Interaction(client, interaction, "❌ Ce ticket n'est plus actif.", [], true);
        }
        return;
    }

    // Admin Side (Guild Settings)
    const config = await getGuildConfig(guild.id);

    if (customId === 'modmail_home') {
        await showModmailMenu(client, interaction, config);
    } else if (customId === 'modmail_toggle') {
        config.modmail.enabled = !config.modmail.enabled;
        await config.save();
        await showModmailMenu(client, interaction, config);
    } else if (customId === 'modmail_category_select') {
        config.modmail.categoryId = interaction.values[0];
        await config.save();
        await showModmailMenu(client, interaction, config);
    } else if (customId === 'modmail_role_select') {
        config.modmail.staffRoleId = interaction.values[0];
        await config.save();
        await showModmailMenu(client, interaction, config);
    }
}

async function showModmailMenu(client, interaction, config) {
    const mm = config.modmail;
    const status = mm.enabled ? "✅ Activé" : "❌ Désactivé";
    const category = mm.categoryId ? `<#${mm.categoryId}>` : "Non défini";
    const role = mm.staffRoleId ? `<@&${mm.staffRoleId}>` : "Non défini";

    const content = `**📨 Configuration Modmail**\n\n` +
                    `État : **${status}**\n` +
                    `Catégorie : ${category}\n` +
                    `Rôle Staff : ${role}\n\n` +
                    `Le système Modmail permet aux membres de contacter le staff via les DMs du bot.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('modmail_toggle')
                .setLabel(mm.enabled ? 'Désactiver' : 'Activer')
                .setStyle(mm.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowCategory = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('modmail_category_select')
                .setPlaceholder('Choisir la catégorie des tickets')
                .setChannelTypes(ChannelType.GuildCategory)
        );

    const rowRole = new ActionRowBuilder()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('modmail_role_select')
                .setPlaceholder('Choisir le rôle Staff')
        );

    if (interaction.type === 3) {
        await updateV2Interaction(client, interaction, content, [rowControls, rowCategory, rowRole]);
    } else {
        // Message
        await sendV2Message(client, interaction.channel.id, content, [rowControls, rowCategory, rowRole]);
    }
}

async function showReportMenu(client, interaction, config) {
    const report = config.report;
    const status = report.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = report.channelId ? `<#${report.channelId}>` : "Non défini";

    const content = `**🚨 Configuration Report**\n\n` +
                    `État : **${status}**\n` +
                    `Salon de logs : ${channel}\n\n` +
                    `Permet aux utilisateurs de signaler des messages via Clic Droit > Applications > Report Message.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('report_toggle')
                .setLabel(report.enabled ? 'Désactiver' : 'Activer')
                .setStyle(report.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('report_channel_select')
                .setPlaceholder('Choisir le salon de logs')
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.type === 3) { // Component
        await updateV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    } else {
        await sendV2Message(client, interaction.channel.id, content, [rowControls, rowChannel]);
    }
}

// --- REPORT CONTEXT HANDLER ---
async function handleReportContext(client, interaction) {
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.report || !config.report.enabled || !config.report.channelId) {
        return replyV2Interaction(client, interaction, "❌ Le système de signalement n'est pas activé sur ce serveur.", [], true);
    }

    const message = interaction.targetMessage;
    
    // Show Modal for Reason
    const modal = new ModalBuilder()
        .setCustomId(`report_modal_${message.id}`)
        .setTitle('Signaler un message');

    const reasonInput = new TextInputBuilder()
        .setCustomId('report_reason')
        .setLabel("Raison du signalement")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleReportModal(client, interaction) {
    const messageId = interaction.customId.split('_')[2];
    const reason = interaction.fields.getTextInputValue('report_reason');
    
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.report || !config.report.channelId) {
        return replyV2Interaction(client, interaction, "❌ Configuration invalide.", [], true);
    }

    const logChannel = interaction.guild.channels.cache.get(config.report.channelId);
    if (!logChannel) {
        return replyV2Interaction(client, interaction, "❌ Le salon de logs report est introuvable.", [], true);
    }

    // Fetch reported message if possible (to get content/author)
    let reportedContent = "Message introuvable";
    let reportedAuthor = "Inconnu";
    let messageLink = `https://discord.com/channels/${interaction.guild.id}/${interaction.channelId}/${messageId}`;

    try {
        const channel = interaction.channel; // The channel where command was used
        const msg = await channel.messages.fetch(messageId);
        reportedContent = msg.content || "*Contenu non-textuel*";
        reportedAuthor = msg.author.tag;
        if (msg.attachments.size > 0) reportedContent += " [Pièce jointe]";
    } catch (e) {}

    const reportContent = `🚨 **Nouveau Signalement**\n\n` +
                          `**Signalé par:** <@${interaction.user.id}>\n` +
                          `**Auteur du message:** ${reportedAuthor}\n` +
                          `**Raison:** ${reason}\n` +
                          `**Lien:** [Voir le message](${messageLink})\n\n` +
                          `**Contenu:**\n> ${reportedContent.replace(/\n/g, '\n> ')}`;

    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Voir le message')
                .setStyle(ButtonStyle.Link)
                .setURL(messageLink)
        );

    // Using V2 for the log message too? Yes.
    await sendV2Message(client, logChannel.id, reportContent, [row]);

    await replyV2Interaction(client, interaction, "✅ Signalement envoyé aux modérateurs.", [], true);
}

module.exports = { handleModmailInteraction, showModmailMenu, showReportMenu, handleReportContext };
