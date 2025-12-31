const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const BotOwner = require('../../database/models/BotOwner');
const GlobalBlacklist = require('../../database/models/GlobalBlacklist');

module.exports = {
    name: 'clear',
    description: 'Vide des listes globales (Owners, Blacklist)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const type = args[0]?.toLowerCase();

        if (type === 'owners') {
            // Root Owner check
            if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return sendV2Message(client, message.channel.id, "❌ Seul le Root Owner peut vider la liste des owners.", []);
            }
            
            const deleted = await BotOwner.deleteMany({});
            return sendV2Message(client, message.channel.id, `🔥 **${deleted.deletedCount}** owners ont été supprimés (sauf Root).`, []);
        }
        else if (type === 'bl' || type === 'blacklist') {
            // Root Owner check (safety)
             if (process.env.OWNER_ID && message.author.id !== process.env.OWNER_ID) {
                return sendV2Message(client, message.channel.id, "❌ Seul le Root Owner peut vider la blacklist globale.", []);
            }

            const deleted = await GlobalBlacklist.deleteMany({});
            return sendV2Message(client, message.channel.id, `🔥 **${deleted.deletedCount}** utilisateurs ont été retirés de la blacklist globale.`, []);
        }
        else {
            return sendV2Message(client, message.channel.id, "**Usage:** `+clear <owners/bl>`", []);
        }
    }
};
