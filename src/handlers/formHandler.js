const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Form = require('../database/models/Form');
const { replyV2Interaction, sendV2Message } = require('../utils/componentUtils');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            // --- CONFIGURATION ---
            if (interaction.customId.startsWith('form_config_')) {
                const formId = interaction.customId.replace('form_config_', '');
                
                // Permission check
                if (!interaction.member.permissions.has('Administrator')) return;

                const modal = new ModalBuilder()
                    .setCustomId(`form_create_submit_${formId}`)
                    .setTitle(`Configuration: ${formId}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Titre du Formulaire').setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('questions').setLabel('Questions (séparées par | )').setStyle(TextInputStyle.Paragraph).setPlaceholder('Quel âge as-tu ? | Pourquoi nous rejoindre ?')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel').setLabel('ID Salon Logs').setStyle(TextInputStyle.Short))
                );

                await interaction.showModal(modal);
            }

            // --- START FORM ---
            if (interaction.customId.startsWith('form_start_')) {
                const formId = interaction.customId.replace('form_start_', '');
                const form = await Form.findOne({ guild_id: interaction.guild.id, form_id: formId });

                if (!form) return replyV2Interaction(client, interaction, "❌ Ce formulaire n'existe plus.", [], true);

                // We can only show 5 inputs in a modal. 
                // If more than 5 questions, we need pagination or limit it. 
                // For now, limit to 5.
                
                const modal = new ModalBuilder()
                    .setCustomId(`form_submit_${formId}`)
                    .setTitle(form.title.substring(0, 45));

                form.questions.slice(0, 5).forEach((q, index) => {
                    modal.addComponents(new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(`q_${index}`)
                            .setLabel(q.substring(0, 45))
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ));
                });

                await interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            // --- SAVE CONFIGURATION ---
            if (interaction.customId.startsWith('form_create_submit_')) {
                const formId = interaction.customId.replace('form_create_submit_', '');
                const title = interaction.fields.getTextInputValue('title');
                const questionsRaw = interaction.fields.getTextInputValue('questions');
                const logChannelId = interaction.fields.getTextInputValue('log_channel');

                const questions = questionsRaw.split('|').map(q => q.trim()).filter(q => q.length > 0);

                if (questions.length === 0) return replyV2Interaction(client, interaction, "❌ Au moins une question est requise.", [], true);

                const newForm = new Form({
                    guild_id: interaction.guild.id,
                    form_id: formId,
                    title: title,
                    questions: questions,
                    log_channel_id: logChannelId
                });

                await newForm.save();
                await replyV2Interaction(client, interaction, `✅ Formulaire **${title}** créé avec succès !`, [], true);
                await interaction.message.delete().catch(() => {});
            }

            // --- SUBMIT FORM ---
            if (interaction.customId.startsWith('form_submit_')) {
                const formId = interaction.customId.replace('form_submit_', '');
                const form = await Form.findOne({ guild_id: interaction.guild.id, form_id: formId });

                if (!form) return replyV2Interaction(client, interaction, "❌ Erreur: Formulaire introuvable.", [], true);

                const logChannel = interaction.guild.channels.cache.get(form.log_channel_id);
                if (!logChannel) return replyV2Interaction(client, interaction, "❌ Erreur: Salon de logs introuvable. Contactez un admin.", [], true);

                const embed = new EmbedBuilder()
                    .setTitle(`📝 Nouveau Formulaire: ${form.title}`)
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setColor('#00ffaa')
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${interaction.user.id}` });

                form.questions.slice(0, 5).forEach((q, index) => {
                    const answer = interaction.fields.getTextInputValue(`q_${index}`);
                    embed.addFields({ name: q, value: answer });
                });

                await logChannel.send({ embeds: [embed] });
                await replyV2Interaction(client, interaction, "✅ Votre formulaire a été envoyé avec succès !", [], true);
            }
        }
    });
};