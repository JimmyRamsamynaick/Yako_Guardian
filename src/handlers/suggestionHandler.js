const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Suggestion = require('../database/models/Suggestion');
const { getGuildConfig } = require('../utils/mongoUtils');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function handleSuggestionButton(client, interaction) {
    const { customId, user, guild } = interaction;
    const guildId = guild.id;

    // Settings
    if (customId === 'suggestion_settings_toggle') {
        const config = await getGuildConfig(guild.id);
        config.suggestion.enabled = !config.suggestion.enabled;
        await config.save();
        await showSuggestionSettings(client, interaction, config);
        return;
    }
    if (customId === 'suggestion_channel_select') {
        const config = await getGuildConfig(guild.id);
        config.suggestion.channelId = interaction.values[0];
        await config.save();
        await showSuggestionSettings(client, interaction, config);
        return;
    }

    // Voting / Moderation
    const parts = customId.split('_');
    const action = parts[1]; // upvote, downvote, approve, reject, delete
    const suggestionId = parts[2];

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion) {
        return interaction.reply({ embeds: [createEmbed(await t('suggestion.handler.not_found', guildId), '', 'error')], ephemeral: true });
    }

    if (action === 'upvote' || action === 'downvote') {
        // Check if already voted
        const existingVote = suggestion.voters.find(v => v.userId === user.id);
        if (existingVote) {
            if (existingVote.vote === action) {
                // Remove vote (Toggle)
                suggestion.voters = suggestion.voters.filter(v => v.userId !== user.id);
                if (action === 'upvote') suggestion.upvotes--;
                else suggestion.downvotes--;
            } else {
                // Switch vote
                existingVote.vote = action;
                if (action === 'upvote') { suggestion.upvotes++; suggestion.downvotes--; }
                else { suggestion.downvotes++; suggestion.upvotes--; }
            }
        } else {
            // New vote
            suggestion.voters.push({ userId: user.id, vote: action });
            if (action === 'upvote') suggestion.upvotes++;
            else suggestion.downvotes++;
        }
        
        await suggestion.save();
        await updateSuggestionMessage(client, suggestion, interaction);
    } 
    else if (action === 'approve' || action === 'reject' || action === 'delete') {
        // Permission check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ embeds: [createEmbed(await t('suggestion.handler.permission_denied', guildId), '', 'error')], ephemeral: true });
        }

        if (action === 'delete') {
            await Suggestion.deleteOne({ _id: suggestionId });
            await interaction.message.delete().catch(() => {});
            return; // Done
        }

        suggestion.status = action === 'approve' ? 'approved' : 'rejected';
        await suggestion.save();
        await updateSuggestionMessage(client, suggestion, interaction);
    }
}

async function updateSuggestionMessage(client, suggestion, interaction) {
    const guildId = interaction.guildId;
    // Reconstruct message content
    let authorName = await t('suggestion.handler.unknown_user', guildId);
    try {
        const user = await client.users.fetch(suggestion.authorId);
        authorName = user.tag;
    } catch (e) {}

    let statusEmoji = await t('suggestion.handler.status_pending', guildId);
    if (suggestion.status === 'approved') statusEmoji = await t('suggestion.handler.status_approved', guildId);
    if (suggestion.status === 'rejected') statusEmoji = await t('suggestion.handler.status_rejected', guildId);

    const content = `**${await t('suggestion.handler.embed_title', guildId)}**\n` +
                    `${await t('suggestion.handler.proposed_by', guildId, { author: authorName })}\n\n` +
                    `${suggestion.content}\n\n` +
                    `${await t('suggestion.handler.votes', guildId)}\n` +
                    `👍 ${suggestion.upvotes}  |  👎 ${suggestion.downvotes}\n\n` +
                    `${await t('suggestion.handler.status', guildId, { status: statusEmoji })}`;

    // Buttons
    const row = new ActionRowBuilder();
    if (suggestion.status === 'pending') {
        row.addComponents(
            new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_upvote', guildId)).setStyle(ButtonStyle.Success).setEmoji('👍'),
            new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_downvote', guildId)).setStyle(ButtonStyle.Danger).setEmoji('👎')
        );
        
        // Admin buttons
        const rowAdmin = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`suggestion_approve_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_approve', guildId)).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`suggestion_reject_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_reject', guildId)).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_delete', guildId)).setStyle(ButtonStyle.Danger)
        );

        if (interaction.isMessageComponent && interaction.isMessageComponent()) {
            await interaction.update({ embeds: [createEmbed('', content, 'info')], components: [row, rowAdmin] });
        } else {
            // If called from elsewhere (not interaction update)
            const channel = interaction.guild.channels.cache.get(interaction.channelId);
            const msg = await channel.messages.fetch(suggestion.messageId);
        }
    } else {
        const rowDisabled = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel(`${suggestion.upvotes}`).setStyle(ButtonStyle.Secondary).setEmoji('👍').setDisabled(true),
            new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel(`${suggestion.downvotes}`).setStyle(ButtonStyle.Secondary).setEmoji('👎').setDisabled(true),
            new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel(await t('suggestion.handler.btn_delete', guildId)).setStyle(ButtonStyle.Danger)
        );
        
        if (interaction.isMessageComponent && interaction.isMessageComponent()) {
            await interaction.update({ embeds: [createEmbed('', content, 'info')], components: [rowDisabled] });
        }
    }
}

async function showSuggestionSettings(client, interaction, config) {
    const guildId = interaction.guildId;
    const sugg = config.suggestion || { enabled: false };
    const status = sugg.enabled ? await t('suggestion.handler.settings_status_enabled', guildId) : await t('suggestion.handler.settings_status_disabled', guildId);
    const channel = sugg.channelId ? `<#${sugg.channelId}>` : await t('suggestion.handler.settings_channel_none', guildId);

    const content = `**${await t('suggestion.handler.settings_title', guildId)}**\n\n` +
                    `${await t('suggestion.handler.settings_status_label', guildId, { status })}\n` +
                    `${await t('suggestion.handler.settings_channel_label', guildId, { channel })}\n\n` +
                    `${await t('suggestion.handler.settings_usage', guildId)}`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suggestion_settings_toggle')
                .setLabel(sugg.enabled ? await t('suggestion.handler.settings_btn_disable', guildId) : await t('suggestion.handler.settings_btn_enable', guildId))
                .setStyle(sugg.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('suggestion_channel_select')
                .setPlaceholder(await t('suggestion.handler.settings_placeholder', guildId))
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await interaction.update({ content: null, embeds: [createEmbed(content, '', 'info')], components: [rowControls, rowChannel] });
    } else {
        await interaction.reply({ embeds: [createEmbed(content, '', 'info')], components: [rowControls, rowChannel], ephemeral: true });
    }
}

module.exports = { handleSuggestionButton, showSuggestionSettings };
