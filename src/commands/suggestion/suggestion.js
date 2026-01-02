const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const Suggestion = require('../../database/models/Suggestion');
const { showSuggestionSettings } = require('../../handlers/suggestionHandler');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'suggestion',
    aliases: ['suggest'],
    description: 'Soumettre une suggestion ou configurer le système',
    category: 'Suggestion',
    async execute(client, message, args) {
        // Settings
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('suggestion.permission_admin', message.guild.id), []);
            }
            const config = await getGuildConfig(message.guild.id);
            await showSuggestionSettings(client, message, config);
            return;
        }

        // Submit
        const config = await getGuildConfig(message.guild.id);
        if (!config.suggestion || !config.suggestion.enabled || !config.suggestion.channelId) {
            return sendV2Message(client, message.channel.id, await t('suggestion.suggestion.not_configured', message.guild.id), []);
        }

        const channel = message.guild.channels.cache.get(config.suggestion.channelId);
        if (!channel) return sendV2Message(client, message.channel.id, await t('suggestion.suggestion.channel_not_found', message.guild.id), []);

        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, await t('suggestion.suggestion.usage', message.guild.id), []);

        try {
            // Create Suggestion Doc
            const suggestion = await Suggestion.create({
                guildId: message.guild.id,
                authorId: message.author.id,
                content: content
            });

            // Send Message
            const msgContent = `${await t('suggestion.suggestion.message_title', message.guild.id)}\n` +
                               `${await t('suggestion.suggestion.proposed_by', message.guild.id, { user: message.author.tag })}\n\n` +
                               `${content}\n\n` +
                               `${await t('suggestion.suggestion.votes_title', message.guild.id)}\n` +
                               `${await t('suggestion.suggestion.votes_status', message.guild.id)}\n\n` +
                               `${await t('suggestion.suggestion.status_pending', message.guild.id)}`;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel(await t('suggestion.suggestion.btn_upvote', message.guild.id)).setStyle(ButtonStyle.Success).setEmoji('👍'),
                new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel(await t('suggestion.suggestion.btn_downvote', message.guild.id)).setStyle(ButtonStyle.Danger).setEmoji('👎')
            );

            const rowAdmin = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`suggestion_approve_${suggestion._id}`).setLabel(await t('suggestion.suggestion.btn_approve', message.guild.id)).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`suggestion_reject_${suggestion._id}`).setLabel(await t('suggestion.suggestion.btn_reject', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel(await t('suggestion.suggestion.btn_delete', message.guild.id)).setStyle(ButtonStyle.Danger)
            );

            const sentMsg = await sendV2Message(client, channel.id, msgContent, [row, rowAdmin]);
            
            // Save Message ID
            // V2 message response structure might vary but usually has id.
            suggestion.messageId = sentMsg.id;
            await suggestion.save();

            sendV2Message(client, message.channel.id, await t('suggestion.suggestion.success', message.guild.id), []);
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, await t('suggestion.suggestion.error', message.guild.id), []);
        }
    }
};
