const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { createTicket } = require('../utils/modmailUtils');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

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
        
        if (!targetGuild) return interaction.reply({ embeds: [createEmbed(await t('modmail.handler.server_not_found', interaction.guild.id), '', 'error')], ephemeral: true });

        try {
            await createTicket(client, interaction.user, targetGuild, await t('modmail.handler.ticket_created_select', targetGuild.id));
            // Update the menu to show success
            await interaction.update({ embeds: [createEmbed(await t('modmail.ticket_created', targetGuild.id, { server: targetGuild.name }), '', 'success')], components: [] });
        } catch (e) {
            await interaction.reply({ embeds: [createEmbed(await t('modmail.ticket_error', targetGuild.id, { error: e.message }), '', 'error')], ephemeral: true });
        }
        return;
    }

    // Modmail Claim Button
    if (customId === 'modmail_claim') {
        const ActiveTicket = require('../database/models/ActiveTicket');
        const ticket = await ActiveTicket.findOne({ channelId: interaction.channelId });
        
        if (!ticket) {
            return interaction.reply({ embeds: [createEmbed(await t('modmail.ticket_inactive', interaction.guild.id), '', 'error')], ephemeral: true });
        }

        if (ticket.claimedBy) {
            return interaction.reply({ embeds: [createEmbed(await t('modmail.ticket_already_claimed', interaction.guild.id, { user: `<@${ticket.claimedBy}>` }), '', 'error')], ephemeral: true });
        }

        ticket.claimedBy = interaction.user.id;
        await ticket.save();

        // Disable the claim button or update it
        try {
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            const claimBtn = row.components.find(c => c.data.custom_id === 'modmail_claim');
            if (claimBtn) {
                claimBtn.setDisabled(true);
                claimBtn.setLabel(`${await t('modmail.claimed_by', interaction.guild.id)} ${interaction.user.username}`);
                await interaction.message.edit({ components: [row] });
            }
        } catch (e) {
            console.error("Failed to update claim button:", e);
        }

        await interaction.reply({ embeds: [createEmbed(await t('modmail.ticket_claimed', interaction.guild.id, { user: interaction.user.toString() }), '', 'success')] });
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
            
            // Notify user
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            // We use the guild's language for the DM notification
            if (user) user.send(await t('modmail.ticket_closed_dm', ticket.guildId, { server: interaction.guild.name })).catch(() => {});
        } else {
            interaction.reply({ embeds: [createEmbed(await t('modmail.ticket_inactive', interaction.guild.id), '', 'error')], ephemeral: true });
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
    const guildId = interaction.guild ? interaction.guild.id : interaction.channel.guild.id;
    const status = mm.enabled ? await t('modmail.state_active', guildId) : await t('modmail.state_inactive', guildId);
    const category = mm.categoryId ? `<#${mm.categoryId}>` : await t('modmail.handler.not_defined', guildId);
    const role = mm.staffRoleId ? `<@&${mm.staffRoleId}>` : await t('modmail.handler.not_defined', guildId);

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('modmail_toggle')
                .setLabel(mm.enabled ? await t('modmail.btn_deactivate', guildId) : await t('modmail.btn_activate', guildId))
                .setStyle(mm.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowCategory = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('modmail_category_select')
                .setPlaceholder(await t('modmail.placeholder_category', guildId))
                .setChannelTypes(ChannelType.GuildCategory)
        );

    const rowRole = new ActionRowBuilder()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('modmail_role_select')
                .setPlaceholder(await t('modmail.placeholder_role', guildId))
        );

    const embed = createEmbed(await t('modmail.title', guildId), await t('modmail.description', guildId), 'info');
    
    embed.addFields(
        { name: await t('modmail.state_label', guildId), value: `**${status}**`, inline: true },
        { name: await t('modmail.category', guildId), value: category, inline: true },
        { name: await t('modmail.role', guildId), value: role, inline: true }
    );

    if (interaction.type === 3) {
        await interaction.update({ embeds: [embed], components: [rowControls, rowCategory, rowRole] });
    } else {
        // Message
        await interaction.channel.send({ embeds: [embed], components: [rowControls, rowCategory, rowRole] });
    }
}

async function showReportMenu(client, interaction, config) {
    const report = config.report;
    const guildId = interaction.guild ? interaction.guild.id : interaction.channel.guild.id;
    const status = report.enabled ? await t('modmail.state_active', guildId) : await t('modmail.state_inactive', guildId);
    const channel = report.channelId ? `<#${report.channelId}>` : await t('modmail.handler.not_defined', guildId);

    const content = await t('report.title', guildId) + "\n\n" +
                    await t('report.state', guildId, { status }) + "\n" +
                    await t('report.logs', guildId, { channel }) + "\n\n" +
                    await t('report.description', guildId);

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('report_toggle')
                .setLabel(report.enabled ? await t('report.btn_deactivate', guildId) : await t('report.btn_activate', guildId))
                .setStyle(report.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('report_channel_select')
                .setPlaceholder(await t('report.placeholder', guildId))
                .setChannelTypes(ChannelType.GuildText)
        );

    const embed = createEmbed(content, '', 'info');

    if (interaction.type === 3) { // Component
        await interaction.update({ embeds: [embed], components: [rowControls, rowChannel] });
    } else {
        await interaction.channel.send({ embeds: [embed], components: [rowControls, rowChannel] });
    }
}

// --- REPORT CONTEXT HANDLER ---
async function handleReportContext(client, interaction) {
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.report || !config.report.enabled || !config.report.channelId) {
        return interaction.reply({ embeds: [createEmbed(await t('report.disabled', interaction.guild.id), '', 'error')], ephemeral: true });
    }

    const message = interaction.targetMessage;
    
    // Show Modal for Reason
    const modal = new ModalBuilder()
        .setCustomId(`report_modal_${message.id}`)
        .setTitle(await t('report.modal_title', interaction.guild.id));

    const reasonInput = new TextInputBuilder()
        .setCustomId('report_reason')
        .setLabel(await t('report.modal_label', interaction.guild.id))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleReportModal(client, interaction) {
    const messageId = interaction.customId.split('_')[2];
    const reason = interaction.fields.getTextInputValue('report_reason');
    const guildId = interaction.guild.id;
    
    const config = await getGuildConfig(guildId);
    if (!config.report || !config.report.channelId) {
        return interaction.reply({ embeds: [createEmbed(await t('report.config_invalid', guildId), '', 'error')], ephemeral: true });
    }

    const logChannel = interaction.guild.channels.cache.get(config.report.channelId);
    if (!logChannel) {
        return interaction.reply({ embeds: [createEmbed(await t('report.channel_not_found', guildId), '', 'error')], ephemeral: true });
    }

    // Fetch reported message if possible (to get content/author)
    let reportedContent = await t('modmail.handler.message_not_found', guildId);
    let reportedAuthor = await t('modmail.handler.unknown_user', guildId);
    let messageLink = `https://discord.com/channels/${guildId}/${interaction.channelId}/${messageId}`;

    try {
        const channel = interaction.channel; // The channel where command was used
        const msg = await channel.messages.fetch(messageId);
        reportedContent = msg.content || await t('modmail.handler.non_text_content', guildId);
        reportedAuthor = msg.author.tag;
        if (msg.attachments.size > 0) reportedContent += ` ${await t('modmail.handler.attachment', guildId)}`;
    } catch (e) {}

    const reportContent = `**${await t('modmail.handler.reported_by', guildId)}:** <@${interaction.user.id}>\n` +
                          `**${await t('modmail.handler.message_author', guildId)}:** ${reportedAuthor}\n` +
                          `**${await t('modmail.handler.reason', guildId)}:** ${reason}\n` +
                          `**${await t('modmail.handler.link', guildId)}:** [${await t('modmail.handler.view_message', guildId)}](${messageLink})\n\n` +
                          `**${await t('modmail.handler.content', guildId)}:**\n> ${reportedContent.replace(/\n/g, '\n> ')}`;

    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel(await t('modmail.handler.view_message', guildId))
                .setStyle(ButtonStyle.Link)
                .setURL(messageLink)
        );

    // Using V2 for the log message too? Yes.
    await logChannel.send({ embeds: [createEmbed(await t('modmail.handler.new_report_title', guildId), reportContent, 'error')], components: [row] });

    await interaction.reply({ embeds: [createEmbed(await t('modmail.handler.report_sent', guildId), '', 'success')], ephemeral: true });
}

module.exports = { handleModmailInteraction, showModmailMenu, showReportMenu, handleReportContext };
