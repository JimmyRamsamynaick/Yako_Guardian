const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { db } = require('../../database');

module.exports = {
    name: 'remove',
    description: 'Supprimer des configurations (activity, etc.)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'activity') {
            try {
                // Remove from DB
                db.prepare('UPDATE guild_settings SET bot_activity_type = NULL, bot_activity_text = NULL, bot_activity_url = NULL WHERE guild_id = ?').run(message.guild.id);
                
                // Clear current activity (if it was this guild's turn, or just to be responsive)
                client.user.setActivity(null);

                return sendV2Message(client, message.channel.id, "✅ Activité du bot supprimée pour ce serveur.", []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
            }
        }

        return sendV2Message(client, message.channel.id, "**Usage:** `+remove activity`", []);
    }
};