const { sendV2Message } = require('../../utils/componentUtils');
const Suggestion = require('../../database/models/Suggestion');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'suggestion',
    description: 'Poste ou gère une suggestion',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        // --- ADMIN COMMANDS ---
        if (['accept', 'refuse', 'delete'].includes(sub)) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les messages` requise.", []);
            }

            let messageId = args[1];
            if (!messageId) {
                return sendV2Message(client, message.channel.id, `**Usage:** \`+suggestion ${sub} <ID Message | last>\``, []);
            }

            let suggestion;
            if (messageId.toLowerCase() === 'last') {
                suggestion = await Suggestion.findOne({ guildId: message.guild.id }).sort({ createdAt: -1 });
                if (suggestion) messageId = suggestion.messageId;
            } else {
                // Try to find by messageId first, then by _id
                suggestion = await Suggestion.findOne({ messageId: messageId });
                if (!suggestion && messageId.match(/^[0-9a-fA-F]{24}$/)) {
                     suggestion = await Suggestion.findById(messageId);
                }
            }

            if (!suggestion) {
                return sendV2Message(client, message.channel.id, "❌ Suggestion introuvable dans la base de données.", []);
            }

            // Fetch the message to edit/delete it
            let targetMsg;
            try {
                targetMsg = await message.channel.messages.fetch(messageId);
            } catch {
                // Message maybe deleted manually, but we still update DB
            }

            if (sub === 'delete') {
                await Suggestion.deleteOne({ _id: suggestion._id });
                if (targetMsg) await targetMsg.delete().catch(() => {});
                return sendV2Message(client, message.channel.id, "🗑️ Suggestion supprimée.", []);
            }

            if (sub === 'accept') {
                suggestion.status = 'approved';
                await suggestion.save();
                
                const newContent = `**✅ Suggestion Approuvée**\nProposée par <@${suggestion.authorId}>\n\n> ${suggestion.content}\n\n_Validée par ${message.author.tag}_`;
                if (targetMsg) await targetMsg.edit({ content: newContent, components: [] }); // Remove buttons
                return sendV2Message(client, message.channel.id, "✅ Suggestion validée.", []);
            }

            if (sub === 'refuse') {
                suggestion.status = 'rejected';
                await suggestion.save();
                
                const newContent = `**❌ Suggestion Refusée**\nProposée par <@${suggestion.authorId}>\n\n> ${suggestion.content}\n\n_Refusée par ${message.author.tag}_`;
                if (targetMsg) await targetMsg.edit({ content: newContent, components: [] }); // Remove buttons
                return sendV2Message(client, message.channel.id, "❌ Suggestion refusée.", []);
            }
            return;
        }

        // --- USER COMMAND (POST) ---
        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, "❌ Veuillez écrire votre suggestion.", []);

        const suggestion = new Suggestion({
            guildId: message.guild.id,
            authorId: message.author.id,
            content: content
        });
        const savedSuggestion = await suggestion.save();

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

        const msgContent = `**📢 Nouvelle Suggestion**\nProposée par <@${message.author.id}>\n\n> ${content}\n\nID: \`${savedSuggestion._id}\``;
        const sentMsg = await sendV2Message(client, message.channel.id, msgContent, [row]);

        savedSuggestion.messageId = sentMsg.id;
        await savedSuggestion.save();

        await message.delete().catch(() => {});
    }
};