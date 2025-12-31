const { sendV2Message } = require('../../utils/componentUtils');
const Suggestion = require('../../database/models/Suggestion');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'suggestion',
    description: 'Poste une suggestion',
    category: 'Utils',
    async run(client, message, args) {
        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, "❌ Veuillez écrire votre suggestion.", []);

        // Create the suggestion in DB first to get the ID
        const suggestion = new Suggestion({
            guildId: message.guild.id,
            authorId: message.author.id,
            content: content
        });
        const savedSuggestion = await suggestion.save();

        // Create Buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`suggestion_up_${savedSuggestion._id}`)
                    .setLabel('👍 0')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`suggestion_down_${savedSuggestion._id}`)
                    .setLabel('👎 0')
                    .setStyle(ButtonStyle.Danger)
            );

        // Send the message
        const msgContent = `**📢 Nouvelle Suggestion**\nProposée par <@${message.author.id}>\n\n> ${content}`;
        const sentMsg = await sendV2Message(client, message.channel.id, msgContent, [row]);

        // Update DB with messageId (if needed later for editing/deleting)
        savedSuggestion.messageId = sentMsg.id;
        await savedSuggestion.save();

        // Delete the original command message to keep chat clean
        await message.delete().catch(() => {});
    }
};