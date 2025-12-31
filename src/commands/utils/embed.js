const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Routes
} = require('discord.js');
const { sendV2Message, replyV2Interaction, updateV2Interaction } = require('../../utils/componentUtils');

// Cache to store embed drafts: userId -> { embedData, previewMessageId, previewToken }
const embedDrafts = new Map();

async function updatePreview(client, draft, embed, interaction) {
    // Try to edit the existing preview if we have one and a token
    if (draft.previewMessageId && draft.previewToken) {
        try {
            // Use REST to edit the original ephemeral message
            await client.rest.patch(
                Routes.webhookMessage(client.user.id, draft.previewToken, draft.previewMessageId), 
                { 
                    body: { 
                        content: "**[APERÇU]**", 
                        embeds: [embed] 
                    } 
                }
            );
            return; // Success, no need to send new one
        } catch (e) {
            // If failed (e.g. token expired), fall through to send new one
             // console.log("Failed to edit preview, sending new one:", e.message);
        }
    }

    // Fallback: Send new ephemeral message
    try {
        const msg = await interaction.webhook.send({
            content: "**[APERÇU]**",
            embeds: [embed],
            ephemeral: true,
            fetchReply: true
        });
        draft.previewMessageId = msg.id;
        draft.previewToken = interaction.token; // Update token to the new one (valid for 15 mins)
    } catch (e) {
        console.error("Failed to send preview:", e);
    }
}

function getEmbedFromDraft(draft) {
    const embed = new EmbedBuilder();
    if (draft.title) embed.setTitle(draft.title);
    if (draft.description) embed.setDescription(draft.description);
    if (draft.color) embed.setColor(draft.color);
    if (draft.footer) embed.setFooter({ text: draft.footer });
    if (draft.image) embed.setImage(draft.image);
    if (draft.thumbnail) embed.setThumbnail(draft.thumbnail);
    if (draft.fields && draft.fields.length > 0) embed.addFields(draft.fields);
    return embed;
}

function getControls() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_edit_title').setLabel('Titre').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed_edit_desc').setLabel('Description').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed_edit_color').setLabel('Couleur').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('embed_edit_footer').setLabel('Footer').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_add_field').setLabel('Ajouter Champ').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed_clear_fields').setLabel('Vider Champs').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('embed_edit_image').setLabel('Image/Thumb').setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_send').setLabel('ENVOYER').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed_cancel').setLabel('Annuler').setStyle(ButtonStyle.Danger)
    );
    
    return [row1, row2, row3];
}

async function handleEmbedInteraction(client, interaction) {
    let draft = embedDrafts.get(interaction.user.id);
    
    if (!draft && interaction.customId === 'embed_start') {
        draft = {
            title: 'Nouveau Titre',
            description: 'Description par défaut',
            color: '#2f3136',
            fields: [],
            footer: null,
            image: null,
            thumbnail: null
        };
        embedDrafts.set(interaction.user.id, draft);
    } else if (!draft) {
        // Expired or missing
        return replyV2Interaction(client, interaction, "❌ Session expirée. Veuillez relancer `+embed`.", [], true);
    }

    const { customId } = interaction;

    // --- BUTTONS ---

    if (customId === 'embed_start') {
        const embed = getEmbedFromDraft(draft);
        // Reply with V2 UI
        await replyV2Interaction(client, interaction, 
            "**🛠️ GÉNÉRATEUR D'EMBED**\nConfigurez votre embed ci-dessous. (Seul vous voyez ceci)\n_L'aperçu de l'embed est envoyé juste en dessous._", 
            getControls(), 
            true
        );
        
        // Delete the trigger message to keep channel clean and ensure privacy
        // We do this AFTER replying to ensure the interaction is valid, but it works either way.
        try {
            if (interaction.message && interaction.message.deletable) {
                await interaction.message.delete();
            }
        } catch (e) {
            // Ignore if already deleted or missing permissions
        }

        // Send separate preview message (Epemeral)
        // Use webhook.send to bypass InteractionNotReplied check since we replied via REST manually
        const previewMsg = await interaction.webhook.send({ 
            content: "**[APERÇU]**", 
            embeds: [embed], 
            ephemeral: true,
            fetchReply: true
        });
        draft.previewMessageId = previewMsg.id; 
        draft.previewToken = interaction.token; // Store token for future edits
        
        return;
    }

    if (customId === 'embed_cancel') {
        embedDrafts.delete(interaction.user.id);
        return updateV2Interaction(client, interaction, "❌ Création annulée.", [], []);
    }

    if (customId === 'embed_send') {
        const embed = getEmbedFromDraft(draft);
        try {
            await interaction.channel.send({ embeds: [embed] });
            embedDrafts.delete(interaction.user.id);
            return updateV2Interaction(client, interaction, "✅ Embed envoyé dans le salon !", [], []);
        } catch (e) {
            return replyV2Interaction(client, interaction, "❌ Erreur lors de l'envoi (Permissions ?)", [], true);
        }
    }

    if (customId === 'embed_clear_fields') {
        draft.fields = [];
        const embed = getEmbedFromDraft(draft);
        await updateV2Interaction(client, interaction, "**🛠️ GÉNÉRATEUR D'EMBED**", getControls());
        await updatePreview(client, draft, embed, interaction);
        return;
    }

    // --- MODALS OPENING ---
    if (customId === 'embed_edit_title') {
        const modal = new ModalBuilder().setCustomId('modal_embed_title').setTitle('Modifier le Titre');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_title').setLabel('Titre').setStyle(TextInputStyle.Short).setValue(draft.title || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_desc') {
        const modal = new ModalBuilder().setCustomId('modal_embed_desc').setTitle('Modifier la Description');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(draft.description || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_color') {
        const modal = new ModalBuilder().setCustomId('modal_embed_color').setTitle('Modifier la Couleur');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_color').setLabel('Couleur (Hex)').setStyle(TextInputStyle.Short).setValue(draft.color || '#2f3136')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_footer') {
        const modal = new ModalBuilder().setCustomId('modal_embed_footer').setTitle('Modifier le Footer');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_footer').setLabel('Texte du Footer').setStyle(TextInputStyle.Short).setValue(draft.footer || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_image') {
        const modal = new ModalBuilder().setCustomId('modal_embed_image').setTitle('Images');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_image').setLabel('URL Image').setStyle(TextInputStyle.Short).setRequired(false).setValue(draft.image || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_thumb').setLabel('URL Thumbnail').setStyle(TextInputStyle.Short).setRequired(false).setValue(draft.thumbnail || ''))
        );
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_add_field') {
        const modal = new ModalBuilder().setCustomId('modal_embed_field').setTitle('Ajouter un Champ');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_name').setLabel('Titre du champ').setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_value').setLabel('Contenu').setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_inline').setLabel('Inline? (oui/non)').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
        return;
    }

    // --- MODALS SUBMIT ---

    if (interaction.isModalSubmit()) {
        if (customId === 'modal_embed_title') {
            draft.title = interaction.fields.getTextInputValue('input_title');
        } else if (customId === 'modal_embed_desc') {
            draft.description = interaction.fields.getTextInputValue('input_desc');
        } else if (customId === 'modal_embed_color') {
            draft.color = interaction.fields.getTextInputValue('input_color');
        } else if (customId === 'modal_embed_footer') {
            draft.footer = interaction.fields.getTextInputValue('input_footer');
        } else if (customId === 'modal_embed_image') {
            const img = interaction.fields.getTextInputValue('input_image');
            const thumb = interaction.fields.getTextInputValue('input_thumb');
            if (img) draft.image = img;
            if (thumb) draft.thumbnail = thumb;
        } else if (customId === 'modal_embed_field') {
            const name = interaction.fields.getTextInputValue('input_field_name');
            const value = interaction.fields.getTextInputValue('input_field_value');
            const inlineStr = interaction.fields.getTextInputValue('input_field_inline').toLowerCase();
            const inline = inlineStr === 'oui' || inlineStr === 'yes' || inlineStr === 'true';
            
            if (name && value) {
                draft.fields.push({ name, value, inline });
            }
        }

        const embed = getEmbedFromDraft(draft);
        await updateV2Interaction(client, interaction, "**🛠️ GÉNÉRATEUR D'EMBED**", getControls());
        // Send updated preview
        await updatePreview(client, draft, embed, interaction);
        return;
    }
}

module.exports = {
    name: 'embed',
    description: 'Générateur d\'embed interactif',
    category: 'Utilitaire',
    async run(client, message, args) {
        await message.delete().catch(() => {});
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('embed_start').setLabel('🚀 Lancer le Créateur d\'Embed').setStyle(ButtonStyle.Primary)
        );
        // We use sendV2Message for the trigger button
        await sendV2Message(client, message.channel.id, "Cliquez ci-dessous pour créer un embed (Mode Privé).", [row]);
    },
    handleEmbedInteraction
};