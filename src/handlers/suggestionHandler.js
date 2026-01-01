const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Suggestion = require('../database/models/Suggestion');
const { getGuildConfig } = require('../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../utils/componentUtils');

async function handleSuggestionButton(client, interaction) {
    const { customId, user, guild } = interaction;

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
        return replyV2Interaction(client, interaction, "❌ Suggestion introuvable (peut-être supprimée).", [], true);
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
            return replyV2Interaction(client, interaction, "❌ Permission refusée.", [], true);
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
    // Reconstruct message content
    let authorName = "Utilisateur Inconnu";
    try {
        const user = await client.users.fetch(suggestion.authorId);
        authorName = user.tag;
    } catch (e) {}

    let statusEmoji = "⏳ En attente";
    if (suggestion.status === 'approved') statusEmoji = "✅ Approuvée";
    if (suggestion.status === 'rejected') statusEmoji = "❌ Rejetée";

    const content = `**💡 Suggestion**\n` +
                    `Proposée par: **${authorName}**\n\n` +
                    `${suggestion.content}\n\n` +
                    `📊 **Votes:**\n` +
                    `👍 ${suggestion.upvotes}  |  👎 ${suggestion.downvotes}\n\n` +
                    `Statut: **${statusEmoji}**`;

    // Buttons
    const row = new ActionRowBuilder();
    if (suggestion.status === 'pending') {
        row.addComponents(
            new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel('Pour').setStyle(ButtonStyle.Success).setEmoji('👍'),
            new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel('Contre').setStyle(ButtonStyle.Danger).setEmoji('👎')
        );
        
        // Admin buttons
        const rowAdmin = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`suggestion_approve_${suggestion._id}`).setLabel('Approuver').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`suggestion_reject_${suggestion._id}`).setLabel('Rejeter').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel('Supprimer').setStyle(ButtonStyle.Danger)
        );

        if (interaction.isMessageComponent && interaction.isMessageComponent()) {
            await updateV2Interaction(client, interaction, content, [row, rowAdmin]);
        } else {
            // If called from elsewhere (not interaction update)
            const channel = interaction.guild.channels.cache.get(interaction.channelId);
            const msg = await channel.messages.fetch(suggestion.messageId);
            // This is trickier with V2 because "edit" on a message object uses standard API.
            // We should use our editV2Message util if possible, or just interaction update if we are in interaction.
            // Here we are in interaction context typically (button click).
            
            // Wait, if it's "updateSuggestionMessage", we might be responding to the interaction that triggered it.
            // So updateV2Interaction is correct.
        }
    } else {
        const rowDisabled = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel(`${suggestion.upvotes}`).setStyle(ButtonStyle.Secondary).setEmoji('👍').setDisabled(true),
            new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel(`${suggestion.downvotes}`).setStyle(ButtonStyle.Secondary).setEmoji('👎').setDisabled(true),
            new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel('Supprimer').setStyle(ButtonStyle.Danger)
        );
        
        if (interaction.isMessageComponent && interaction.isMessageComponent()) {
            await updateV2Interaction(client, interaction, content, [rowDisabled]);
        }
    }
}

async function showSuggestionSettings(client, interaction, config) {
    const sugg = config.suggestion || { enabled: false };
    const status = sugg.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = sugg.channelId ? `<#${sugg.channelId}>` : "Non défini";

    const content = `**💡 Configuration Suggestions**\n\n` +
                    `État : **${status}**\n` +
                    `Salon : ${channel}\n\n` +
                    `Les membres peuvent utiliser \`+suggestion <message>\` pour poster une idée.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suggestion_settings_toggle')
                .setLabel(sugg.enabled ? 'Désactiver' : 'Activer')
                .setStyle(sugg.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('suggestion_channel_select')
                .setPlaceholder('Choisir le salon des suggestions')
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await updateV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    } else {
        await replyV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    }
}

module.exports = { handleSuggestionButton, showSuggestionSettings };
