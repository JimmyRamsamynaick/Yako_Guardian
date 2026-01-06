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
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

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
                        content: await t('embed.preview', interaction.guildId), 
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
            content: await t('embed.preview', interaction.guildId),
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

async function getControls(guildId) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_edit_title').setLabel(await t('embed.btn_title', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed_edit_desc').setLabel(await t('embed.btn_desc', guildId)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed_edit_color').setLabel(await t('embed.btn_color', guildId)).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('embed_edit_footer').setLabel(await t('embed.btn_footer', guildId)).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_add_field').setLabel(await t('embed.btn_add_field', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed_clear_fields').setLabel(await t('embed.btn_clear_fields', guildId)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('embed_edit_image').setLabel(await t('embed.btn_image', guildId)).setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed_send').setLabel(await t('embed.btn_send', guildId)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed_cancel').setLabel(await t('embed.btn_cancel', guildId)).setStyle(ButtonStyle.Danger)
    );
    
    return [row1, row2, row3];
}

async function handleEmbedInteraction(client, interaction) {
    let draft = embedDrafts.get(interaction.user.id);
    
    if (!draft && interaction.customId === 'embed_start') {
        draft = {
            title: await t('embed.default_title', interaction.guildId),
            description: await t('embed.default_description', interaction.guildId),
            color: '#2f3136',
            fields: [],
            footer: null,
            image: null,
            thumbnail: null
        };
        embedDrafts.set(interaction.user.id, draft);
    } else if (!draft) {
        // Expired or missing
        return interaction.reply({ 
            embeds: [createEmbed(await t('embed.session_expired', interaction.guildId), '', 'error')],
            ephemeral: true 
        });
    }

    const { customId } = interaction;

    // --- BUTTONS ---

    if (customId === 'embed_start') {
        const embed = getEmbedFromDraft(draft);
        // Reply with V2 UI
        await interaction.reply({
            embeds: [createEmbed(await t('embed.generator_title', interaction.guildId) + "\n" + await t('embed.generator_desc', interaction.guildId), '', 'info')],
            components: await getControls(interaction.guildId),
            ephemeral: true
        });
        
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
            content: await t('embed.preview', interaction.guildId), 
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
        return interaction.update({
            embeds: [createEmbed(await t('embed.cancel_msg', interaction.guildId), '', 'info')],
            components: []
        });
    }

    if (customId === 'embed_send') {
        const embed = getEmbedFromDraft(draft);
        try {
            await interaction.channel.send({ embeds: [embed] });
            embedDrafts.delete(interaction.user.id);
            return interaction.update({
                embeds: [createEmbed(await t('embed.success', interaction.guildId), '', 'success')],
                components: []
            });
        } catch (e) {
            return interaction.reply({
                embeds: [createEmbed(await t('embed.error_send', interaction.guildId), '', 'error')],
                ephemeral: true
            });
        }
    }

    if (customId === 'embed_clear_fields') {
        draft.fields = [];
        const embed = getEmbedFromDraft(draft);
        await interaction.update({
            embeds: [createEmbed(await t('embed.generator_title', interaction.guildId), '', 'info')],
            components: await getControls(interaction.guildId)
        });
        await updatePreview(client, draft, embed, interaction);
        return;
    }

    // --- MODALS OPENING ---
    if (customId === 'embed_edit_title') {
        const modal = new ModalBuilder().setCustomId('modal_embed_title').setTitle(await t('utils.embed.modal_title_title', interaction.guildId));
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_title').setLabel(await t('utils.embed.label_title', interaction.guildId)).setStyle(TextInputStyle.Short).setValue(draft.title || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_desc') {
        const modal = new ModalBuilder().setCustomId('modal_embed_desc').setTitle(await t('utils.embed.modal_desc_title', interaction.guildId));
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_desc').setLabel(await t('utils.embed.label_desc', interaction.guildId)).setStyle(TextInputStyle.Paragraph).setValue(draft.description || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_color') {
        const modal = new ModalBuilder().setCustomId('modal_embed_color').setTitle(await t('utils.embed.modal_color_title', interaction.guildId));
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_color').setLabel(await t('utils.embed.label_color', interaction.guildId)).setStyle(TextInputStyle.Short).setValue(draft.color || '#2f3136')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_footer') {
        const modal = new ModalBuilder().setCustomId('modal_embed_footer').setTitle(await t('utils.embed.modal_footer_title', interaction.guildId));
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('input_footer').setLabel(await t('utils.embed.label_footer', interaction.guildId)).setStyle(TextInputStyle.Short).setValue(draft.footer || '')
        ));
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_edit_image') {
        const modal = new ModalBuilder().setCustomId('modal_embed_image').setTitle(await t('utils.embed.modal_image_title', interaction.guildId));
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_image').setLabel(await t('utils.embed.label_image_url', interaction.guildId)).setStyle(TextInputStyle.Short).setRequired(false).setValue(draft.image || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_thumb').setLabel(await t('utils.embed.label_thumb_url', interaction.guildId)).setStyle(TextInputStyle.Short).setRequired(false).setValue(draft.thumbnail || ''))
        );
        await interaction.showModal(modal);
        return;
    }
    if (customId === 'embed_add_field') {
        const modal = new ModalBuilder().setCustomId('modal_embed_field').setTitle(await t('utils.embed.modal_field_title', interaction.guildId));
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_name').setLabel(await t('utils.embed.label_field_title', interaction.guildId)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_value').setLabel(await t('utils.embed.label_field_value', interaction.guildId)).setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_field_inline').setLabel(await t('utils.embed.label_field_inline', interaction.guildId)).setStyle(TextInputStyle.Short).setRequired(false))
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
        await interaction.update({
            embeds: [createEmbed(await t('embed.generator_title', interaction.guildId), '', 'info')],
            components: await getControls(interaction.guildId)
        });
        // Send updated preview
        await updatePreview(client, draft, embed, interaction);
        return;
    }
}

module.exports = {
    name: 'embed',
    description: 'Générateur d\'embed interactif',
    category: 'Utils',
    async run(client, message, args) {
        await message.delete().catch(() => {});
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('embed_start').setLabel(await t('embed.trigger_btn', message.guild.id)).setStyle(ButtonStyle.Primary)
        );
        await message.channel.send({ embeds: [createEmbed(await t('embed.trigger_msg', message.guild.id), '', 'info')], components: [row] });
    },
    handleEmbedInteraction
};