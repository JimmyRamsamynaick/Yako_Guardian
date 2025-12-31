const { sendV2Message } = require('../../utils/componentUtils');
const BotOwner = require('../../database/models/BotOwner');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'owner',
    description: 'Gère les owners du bot',
    category: 'Owner',
    aliases: ['unowner'],
    async run(client, message, args) {
        // Security check
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0]?.toLowerCase();

        // --- CLEAR OWNERS ---
        if (commandName === 'owner' && sub === 'clear') {
            if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return sendV2Message(client, message.channel.id, "❌ Seul le Root Owner peut vider la liste.", []);
            }
            
            // Confirm button could be added here for UX, but simple command for now
            const deleted = await BotOwner.deleteMany({});
            return sendV2Message(client, message.channel.id, `🔥 **${deleted.deletedCount}** owners ont été supprimés (sauf Root).`, []);
        }

        // --- UNOWNER (Remove) ---
        if (commandName === 'unowner') {
            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, "**Usage:** `+unowner <@user/ID>`", []);

            if (process.env.OWNER_ID && targetId === process.env.OWNER_ID) return sendV2Message(client, message.channel.id, "❌ Impossible de retirer le Root Owner.", []);

            const deleted = await BotOwner.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'est pas owner.", []);

            return sendV2Message(client, message.channel.id, `🗑️ <@${targetId}> n'est plus owner.`, []);
        }

        // --- OWNER ADD ---
        if (commandName === 'owner' && sub) {
            let targetId = null;

            if (sub === 'add' && args[1]) {
                targetId = args[1].replace(/[<@!>]/g, '');
            } else if (sub.match(/^\d+$/) || sub.startsWith('<@')) {
                targetId = sub.replace(/[<@!>]/g, '');
            }

            if (targetId) {
                if (await isBotOwner(targetId)) return sendV2Message(client, message.channel.id, "⚠️ Cet utilisateur est déjà owner.", []);

                await BotOwner.create({ userId: targetId, addedBy: message.author.id });
                return sendV2Message(client, message.channel.id, `✅ <@${targetId}> est maintenant **Owner** du bot.`, []);
            }
        }

        // --- OWNER DEL/REMOVE ---
        if (commandName === 'owner' && (sub === 'del' || sub === 'remove') && args[1]) {
             const targetId = args[1].replace(/[<@!>]/g, '');
             if (!targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, "**Usage:** `+owner del <@user/ID>`", []);

             if (process.env.OWNER_ID && targetId === process.env.OWNER_ID) return sendV2Message(client, message.channel.id, "❌ Impossible de retirer le Root Owner.", []);

             const deleted = await BotOwner.findOneAndDelete({ userId: targetId });
             if (!deleted) return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'est pas owner.", []);

             return sendV2Message(client, message.channel.id, `🗑️ <@${targetId}> n'est plus owner.`, []);
        }

        // --- OWNER LIST (Default) ---
        const owners = await BotOwner.find();
        const rootOwner = process.env.OWNER_ID ? `<@${process.env.OWNER_ID}> (Root)` : 'Aucun Root défini';
        
        let content = `**👑 LISTE DES OWNERS**\n\n**Root:** ${rootOwner}\n\n`;
        if (owners.length === 0) content += "_Aucun owner supplémentaire._";
        else content += owners.map(o => `• <@${o.userId}> (Ajouté par <@${o.addedBy}>)`).join('\n');

        return sendV2Message(client, message.channel.id, content, []);
    }
};
