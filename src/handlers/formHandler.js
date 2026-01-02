const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Form = require('../database/models/Form');
const { replyV2Interaction, sendV2Message } = require('../utils/componentUtils');
const { t } = require('../utils/i18n');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            const guildId = interaction.guild.id;
            // --- CONFIGURATION ---
            if (interaction.customId.startsWith('form_config_')) {
                const formId = interaction.customId.replace('form_config_', '');
                
                // Permission check
                if (!interaction.member.permissions.has('Administrator')) return;

                const modal = new ModalBuilder()
                    .setCustomId(`form_create_submit_${formId}`)
                    .setTitle(await t('forms.handler.config_title', guildId, { formId }));

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel(await t('forms.handler.config_title_label', guildId)).setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('questions').setLabel(await t('forms.handler.config_questions_label', guildId)).setStyle(TextInputStyle.Paragraph).setPlaceholder(await t('forms.handler.config_questions_placeholder', guildId))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel').setLabel(await t('forms.handler.config_log_channel_label', guildId)).setStyle(TextInputStyle.Short))
                );

                await interaction.showModal(modal);
            }

            // --- START FORM ---
            if (interaction.customId.startsWith('form_start_')) {
                const formId = interaction.customId.replace('form_start_', '');
                const form = await Form.findOne({ guild_id: interaction.guild.id, form_id: formId });

                if (!form) return replyV2Interaction(client, interaction, await t('forms.handler.not_found', guildId), [], true);

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
            const guildId = interaction.guild.id;
            // --- SAVE CONFIGURATION ---
            if (interaction.customId.startsWith('form_create_submit_')) {
                const formId = interaction.customId.replace('form_create_submit_', '');
                const title = interaction.fields.getTextInputValue('title');
                const questionsRaw = interaction.fields.getTextInputValue('questions');
                const logChannelId = interaction.fields.getTextInputValue('log_channel');

                const questions = questionsRaw.split('|').map(q => q.trim()).filter(q => q.length > 0);

                if (questions.length === 0) return replyV2Interaction(client, interaction, await t('forms.handler.questions_required', guildId), [], true);

                const newForm = new Form({
                    guild_id: interaction.guild.id,
                    form_id: formId,
                    title: title,
                    questions: questions,
                    log_channel_id: logChannelId
                });

                await newForm.save();
                await replyV2Interaction(client, interaction, await t('forms.handler.create_success', guildId, { title }), [], true);
                await interaction.message.delete().catch(() => {});
            }

            // --- SUBMIT FORM ---
            if (interaction.customId.startsWith('form_submit_')) {
                const formId = interaction.customId.replace('form_submit_', '');
                const form = await Form.findOne({ guild_id: interaction.guild.id, form_id: formId });

                if (!form) return replyV2Interaction(client, interaction, await t('forms.handler.not_found', guildId), [], true);

                const logChannel = interaction.guild.channels.cache.get(form.log_channel_id);
                if (!logChannel) return replyV2Interaction(client, interaction, await t('forms.handler.log_channel_not_found', guildId), [], true);

                const embed = new EmbedBuilder()
                    .setTitle(await t('forms.handler.new_submission_title', guildId, { title: form.title }))
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setColor('#00ffaa')
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${interaction.user.id}` });

                form.questions.slice(0, 5).forEach((q, index) => {
                    const answer = interaction.fields.getTextInputValue(`q_${index}`);
                    embed.addFields({ name: q, value: answer });
                });

                await logChannel.send({ embeds: [embed] });
                await replyV2Interaction(client, interaction, await t('forms.handler.submission_sent', guildId), [], true);
            }
        }
    });
};