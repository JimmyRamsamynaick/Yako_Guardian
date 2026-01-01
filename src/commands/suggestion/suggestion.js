const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const Suggestion = require('../../database/models/Suggestion');
const { showSuggestionSettings } = require('../../handlers/suggestionHandler');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'suggestion',
    aliases: ['suggest'],
    description: 'Soumettre une suggestion ou configurer le système',
    async execute(client, message, args) {
        // Settings
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
            }
            const config = await getGuildConfig(message.guild.id);
            await showSuggestionSettings(client, message, config);
            return;
        }

        // Submit
        const config = await getGuildConfig(message.guild.id);
        if (!config.suggestion || !config.suggestion.enabled || !config.suggestion.channelId) {
            return sendV2Message(client, message.channel.id, "❌ Le système de suggestions n'est pas activé ou configuré.", []);
        }

        const channel = message.guild.channels.cache.get(config.suggestion.channelId);
        if (!channel) return sendV2Message(client, message.channel.id, "❌ Le salon de suggestions est introuvable.", []);

        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, "Utilisation: `+suggestion <votre idée>`", []);

        try {
            // Create Suggestion Doc
            const suggestion = await Suggestion.create({
                guildId: message.guild.id,
                authorId: message.author.id,
                content: content
            });

            // Send Message
            const msgContent = `**💡 Suggestion**\n` +
                               `Proposée par: **${message.author.tag}**\n\n` +
                               `${content}\n\n` +
                               `📊 **Votes:**\n` +
                               `👍 0  |  👎 0\n\n` +
                               `Statut: ⏳ En attente`;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`suggestion_upvote_${suggestion._id}`).setLabel('Pour').setStyle(ButtonStyle.Success).setEmoji('👍'),
                new ButtonBuilder().setCustomId(`suggestion_downvote_${suggestion._id}`).setLabel('Contre').setStyle(ButtonStyle.Danger).setEmoji('👎')
            );

            const rowAdmin = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`suggestion_approve_${suggestion._id}`).setLabel('Approuver').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`suggestion_reject_${suggestion._id}`).setLabel('Rejeter').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`suggestion_delete_${suggestion._id}`).setLabel('Supprimer').setStyle(ButtonStyle.Danger)
            );

            const sentMsg = await sendV2Message(client, channel.id, msgContent, [row, rowAdmin]);
            
            // Save Message ID
            // V2 message response structure might vary but usually has id.
            suggestion.messageId = sentMsg.id;
            await suggestion.save();

            sendV2Message(client, message.channel.id, "✅ Votre suggestion a été envoyée !", []);
        } catch (e) {
            console.error(e);
            sendV2Message(client, message.channel.id, "❌ Erreur lors de l'envoi de la suggestion.", []);
        }
    }
};
