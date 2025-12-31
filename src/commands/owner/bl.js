const { sendV2Message } = require('../../utils/componentUtils');
const GlobalBlacklist = require('../../database/models/GlobalBlacklist');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'bl',
    description: 'Gère la blacklist globale',
    category: 'Owner',
    aliases: ['unbl', 'blinfo'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0]?.toLowerCase();

        // --- UNBL ---
        if (commandName === 'unbl') {
            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, "**Usage:** `+unbl <@user/ID>`", []);

            const deleted = await GlobalBlacklist.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'est pas blacklist.", []);

            return sendV2Message(client, message.channel.id, `✅ <@${targetId}> retiré de la blacklist globale.`, []);
        }

        // --- BL INFO ---
        if (commandName === 'blinfo') {
             const targetId = args[0]?.replace(/[<@!>]/g, '');
             if (!targetId) return sendV2Message(client, message.channel.id, "**Usage:** `+blinfo <@user/ID>`", []);

             const bl = await GlobalBlacklist.findOne({ userId: targetId });
             if (!bl) return sendV2Message(client, message.channel.id, "ℹ️ Cet utilisateur n'est pas blacklist.", []);

             return sendV2Message(client, message.channel.id, `**⛔ INFO BLACKLIST**\n\n👤 **User:** <@${bl.userId}>\n📝 **Raison:** ${bl.reason}\n👮 **Par:** <@${bl.addedBy}>\n📅 **Date:** ${bl.addedAt.toLocaleDateString()}`, []);
        }

        // --- BL LIST ---
        if (commandName === 'bl' && (!sub || sub === 'list')) {
             if (sub && (sub.match(/^\d+$/) || sub.startsWith('<@'))) {
                 // Pass to ADD
             } else {
                 const bls = await GlobalBlacklist.find();
                 const count = bls.length;
                 let content = `**⛔ BLACKLIST GLOBALE (${count})**\n\n`;
                 if (count === 0) content += "_Aucun utilisateur blacklist._";
                 else {
                     content += bls.slice(0, 15).map(b => `• <@${b.userId}> | ${b.reason}`).join('\n');
                     if (count > 15) content += `\n\n_Et ${count - 15} autres..._`;
                 }
                 return sendV2Message(client, message.channel.id, content, []);
             }
        }

        // --- BL DEL/REMOVE ---
        if (commandName === 'bl' && (sub === 'del' || sub === 'remove') && args[1]) {
            const targetId = args[1].replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, "**Usage:** `+bl del <@user/ID>`", []);

            const deleted = await GlobalBlacklist.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'est pas blacklist.", []);

            return sendV2Message(client, message.channel.id, `✅ <@${targetId}> retiré de la blacklist globale.`, []);
        }

        // --- BL ADD ---
        if (commandName === 'bl') {
            let targetId = null;
            let reason = "Aucune raison";

            if (sub === 'add' && args[1]) {
                targetId = args[1].replace(/[<@!>]/g, '');
                reason = args.slice(2).join(' ') || reason;
            } else if (sub && (sub.match(/^\d+$/) || sub.startsWith('<@'))) {
                targetId = sub.replace(/[<@!>]/g, '');
                reason = args.slice(1).join(' ') || reason;
            }

            if (targetId) {
                if (!targetId.match(/^\d+$/)) return; // Should not happen if regex passed

                if (await GlobalBlacklist.findOne({ userId: targetId })) return sendV2Message(client, message.channel.id, "⚠️ Cet utilisateur est déjà blacklist.", []);
                
                await GlobalBlacklist.create({ userId: targetId, reason, addedBy: message.author.id });
                sendV2Message(client, message.channel.id, `⛔ <@${targetId}> ajouté à la blacklist globale.\n📝 Raison: ${reason}\n\n*Banissement en cours sur tous les serveurs...*`, []);

                // Trigger Global Ban
                client.guilds.cache.forEach(guild => {
                    guild.members.ban(targetId, { reason: `Global Blacklist: ${reason}` }).catch(() => {});
                });
                return;
            }
        }
    }
};
