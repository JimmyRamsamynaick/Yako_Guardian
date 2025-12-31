const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');

module.exports = {
    name: 'remove',
    description: 'Supprime des éléments (Owner)',
    category: 'Owner',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const sub = args[0]?.toLowerCase();

        if (sub === 'activity') {
            client.user.setActivity(null);
            await GlobalSettings.findOneAndUpdate({ clientId: client.user.id }, { activity: { type: null, name: null } }, { upsert: true });
            return sendV2Message(client, message.channel.id, "✅ Activité supprimée.", []);
        }

        return sendV2Message(client, message.channel.id, "**Usage:** `+remove activity`", []);
    }
};
