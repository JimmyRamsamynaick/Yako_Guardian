const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');

module.exports = {
    name: 'remove',
    description: 'Supprimer des configurations ou retirer un membre d\'un ticket',
    category: 'Configuration',
    aliases: ['del', 'delete'],
    async run(client, message, args) {
        // --- TICKET CHECK ---
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (ticket) {
             const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
             if (member) {
                try {
                    await message.channel.permissionOverwrites.edit(member, {
                        ViewChannel: false,
                        SendMessages: false,
                        ReadMessageHistory: false
                    });
                    return sendV2Message(client, message.channel.id, `✅ <@${member.id}> a été retiré du ticket.`, []);
                } catch (e) {
                    return sendV2Message(client, message.channel.id, "❌ Impossible de retirer le membre.", []);
                }
             }
        }

        // --- STANDARD CONFIGURATION REMOVE ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'perm' || sub === 'permission') {
            const targetStr = args[1];
            if (!targetStr) {
                return sendV2Message(client, message.channel.id, "**Usage:** `+del perm <@rôle>`", []);
            }

            let roleId = null;
            if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
            else {
                const id = targetStr.replace(/[<@&>]/g, '');
                if (message.guild.roles.cache.has(id)) roleId = id;
            }

            if (!roleId) {
                return sendV2Message(client, message.channel.id, "❌ Veuillez spécifier un rôle valide.", []);
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.customPermissions || config.customPermissions.length === 0) {
                 return sendV2Message(client, message.channel.id, "ℹ️ Aucune permission configurée à supprimer.", []);
            }

            const initialLength = config.customPermissions.length;
            config.customPermissions = config.customPermissions.filter(p => p.roleId !== roleId);
            const deletedCount = initialLength - config.customPermissions.length;

            if (deletedCount === 0) {
                return sendV2Message(client, message.channel.id, `ℹ️ Aucune permission trouvée pour le rôle <@&${roleId}>.`, []);
            }

            await config.save();
            return sendV2Message(client, message.channel.id, `✅ **${deletedCount}** permissions supprimées pour le rôle <@&${roleId}>.`, []);
        }

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