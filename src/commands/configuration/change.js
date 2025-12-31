const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');

module.exports = {
    name: 'change',
    description: 'Modifie les permissions des commandes',
    category: 'Configuration',
    aliases: ['changeall'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour utiliser cette commande.", []);
        }

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // --- CHANGE COMMAND ---
        if (commandName === 'change') {
            const cmd = args[0];
            const perm = args[1];

            // +change reset
            if (cmd === 'reset') {
                db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(message.guild.id);
                return sendV2Message(client, message.channel.id, "✅ Toutes les permissions personnalisées ont été réinitialisées.", []);
            }

            if (!cmd || !perm) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+change <commande> <permission>` ou `+change reset`\nPermissions: `Administrator`, `ManageMessages`, `BanMembers`, etc. ou `0` (Tout le monde), `-1` (Désactivé)", []);
            }

            // Verify command exists
            const command = client.commands.get(cmd) || client.commands.find(c => c.aliases && c.aliases.includes(cmd));
            if (!command) {
                return sendV2Message(client, message.channel.id, `❌ La commande \`${cmd}\` n'existe pas.`, []);
            }

            // Verify permission validity
            let permValue = perm;
            if (perm !== '0' && perm !== '-1') {
                if (!PermissionsBitField.Flags[perm]) {
                     return sendV2Message(client, message.channel.id, `❌ Permission invalide: \`${perm}\`.\nUtilisez des noms valides comme \`Administrator\`, \`KickMembers\`, etc.`, []);
                }
            }

            db.prepare(`
                INSERT INTO command_permissions (guild_id, command_name, permission)
                VALUES (?, ?, ?)
                ON CONFLICT(guild_id, command_name) DO UPDATE SET permission = ?
            `).run(message.guild.id, command.name, permValue, permValue);

            return sendV2Message(client, message.channel.id, `✅ La commande \`${command.name}\` nécessite maintenant la permission **${permValue === '0' ? 'Aucune (Tout le monde)' : permValue === '-1' ? 'Désactivée' : permValue}**.`, []);
        }

        // --- CHANGEALL COMMAND ---
        if (commandName === 'changeall') {
            const oldPerm = args[0];
            const newPerm = args[1];

            if (!oldPerm || !newPerm) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+changeall <ancienne_perm> <nouvelle_perm>`\nRemplace une permission par une autre sur toutes les commandes modifiées.", []);
            }

            // Verify validity
            if (newPerm !== '0' && newPerm !== '-1' && !PermissionsBitField.Flags[newPerm]) {
                return sendV2Message(client, message.channel.id, `❌ Permission cible invalide: \`${newPerm}\`.`, []);
            }

            const changes = db.prepare('UPDATE command_permissions SET permission = ? WHERE guild_id = ? AND permission = ?').run(newPerm, message.guild.id, oldPerm);

            return sendV2Message(client, message.channel.id, `✅ **${changes.changes}** commandes mises à jour de \`${oldPerm}\` vers \`${newPerm}\`.`, []);
        }
    }
};
