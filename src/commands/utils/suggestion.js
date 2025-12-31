const { sendV2Message, editV2Message } = require('../../utils/componentUtils');
const Suggestion = require('../../database/models/Suggestion');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'suggestion',
    description: 'Poste ou gère une suggestion',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        // --- ADMIN COMMANDS ---
        if (['accept', 'refuse', 'delete', 'clear'].includes(sub)) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les messages` requise.", []);
            }

            if (sub === 'clear') {
                const type = args[1]?.toLowerCase();
                if (!['all', 'approved', 'rejected', 'pending'].includes(type)) {
                    return sendV2Message(client, message.channel.id, "**Usage:** \`+suggestion clear <all | approved | rejected | pending>\`", []);
                }

                let filter = { guildId: message.guild.id };
                if (type !== 'all') {
                    filter.status = type;
                }

                const suggestions = await Suggestion.find(filter);
                const count = suggestions.length;

                if (count === 0) {
                    return sendV2Message(client, message.channel.id, `⚠️ Aucune suggestion trouvée pour le filtre \`${type}\`.`, []);
                }

                // Delete from DB
                await Suggestion.deleteMany(filter);

                // Try to delete messages (optional, best effort)
                let deletedMsgCount = 0;
                // We process in chunks to avoid rate limits, but for now let's just do a simple loop with a small delay or parallel promises
                // Since we might have many, we should limit this or do it in background.
                // For simplicity, let's try to delete the last 50 messages if they are in the channel.
                // Or just don't delete messages to avoid massive API calls?
                // The user asked "vider ou supprimer des idées de la liste", which strongly implies DB.
                // Deleting messages is nice but dangerous/slow.
                // Let's try to bulk delete if possible.
                
                // Collect message IDs that are in the current channel
                // We assume suggestions are in the same channel where command is run?
                // Not necessarily, but likely.
                // If we want to be safe, we just remove from DB.
                
                return sendV2Message(client, message.channel.id, `✅ **${count}** suggestions (${type}) ont été supprimées de la base de données.`, []);
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
                if (targetMsg) {
                    try {
                        // Use editV2Message to avoid legacy field errors with V2 messages
                        await editV2Message(client, message.channel.id, targetMsg.id, newContent, []);
                    } catch (e) {
                         // Fallback if not V2 (shouldn't happen for suggestions but just in case)
                         await targetMsg.edit({ content: newContent, components: [] }).catch(() => {});
                    }
                }
                return sendV2Message(client, message.channel.id, "✅ Suggestion validée.", []);
            }

            if (sub === 'refuse') {
                suggestion.status = 'rejected';
                await suggestion.save();
                
                const newContent = `**❌ Suggestion Refusée**\nProposée par <@${suggestion.authorId}>\n\n> ${suggestion.content}\n\n_Refusée par ${message.author.tag}_`;
                if (targetMsg) {
                    try {
                        // Use editV2Message to avoid legacy field errors with V2 messages
                        await editV2Message(client, message.channel.id, targetMsg.id, newContent, []);
                    } catch (e) {
                         await targetMsg.edit({ content: newContent, components: [] }).catch(() => {});
                    }
                }
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