const { db } = require('../../database');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'modmail',
    description: 'Configure le système de modmail/tickets',
    category: 'Configuration',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();

        // Permission check logic
        // ON/OFF require Administrator
        // CLOSE requires ManageMessages or Administrator
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isMod = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

        if ((sub === 'on' || sub === 'off') && !isAdmin) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour configurer le modmail.", []);
        }

        if (sub === 'close' && !isMod && !isAdmin) {
            return sendV2Message(client, message.channel.id, "❌ Vous devez avoir la permission de gérer les messages pour fermer un ticket.", []);
        }

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                "**📬 Système Modmail**\n\n`+modmail on` : Active le modmail (crée la catégorie si besoin).\n`+modmail off` : Désactive le modmail.\n`+modmail close` : Ferme le ticket actuel (dans un salon de ticket).", 
            []);
        }

        if (sub === 'on') {
            // Check if already enabled
            const settings = db.prepare('SELECT modmail_enabled, modmail_category FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            
            let categoryId = settings?.modmail_category;
            let category;

            // Check if category exists
            if (categoryId) {
                category = message.guild.channels.cache.get(categoryId);
            }

            // Create category if missing
            if (!category) {
                try {
                    category = await message.guild.channels.create({
                        name: 'Modmail Tickets',
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: message.guild.id,
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: message.guild.members.me.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages],
                            },
                            // Add admins/mods? For now just admins/owner will see via admin perms
                        ],
                    });
                    categoryId = category.id;
                } catch (e) {
                    return sendV2Message(client, message.channel.id, `❌ Erreur lors de la création de la catégorie : ${e.message}`, []);
                }
            }

            db.prepare('UPDATE guild_settings SET modmail_enabled = ?, modmail_category = ? WHERE guild_id = ?')
              .run('on', categoryId, message.guild.id);

            return sendV2Message(client, message.channel.id, `✅ **Modmail activé !**\nLes messages privés envoyés au bot ouvriront un ticket dans la catégorie **${category.name}**.`, []);
        }

        if (sub === 'off') {
            db.prepare('UPDATE guild_settings SET modmail_enabled = ? WHERE guild_id = ?').run('off', message.guild.id);
            return sendV2Message(client, message.channel.id, "✅ **Modmail désactivé.**", []);
        }

        if (sub === 'close') {
            // Check if we are in a ticket channel
            // A ticket channel is usually under the modmail category and has a user ID in topic
            const settings = db.prepare('SELECT modmail_category FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            
            if (!settings || !settings.modmail_category) {
                return sendV2Message(client, message.channel.id, "❌ Le modmail n'est pas configuré.", []);
            }

            if (message.channel.parentId !== settings.modmail_category) {
                return sendV2Message(client, message.channel.id, "❌ Cette commande ne peut être utilisée que dans un ticket modmail.", []);
            }

            const userId = message.channel.topic;
            if (!userId) {
                return sendV2Message(client, message.channel.id, "❌ Impossible d'identifier l'utilisateur de ce ticket (Topic vide).", []);
            }

            // Notify user
            try {
                const user = await client.users.fetch(userId);
                await user.send(`🔒 **Votre ticket sur ${message.guild.name} a été fermé.**`);
            } catch (e) {
                // User blocked DMs or left
            }

            // Clean DB
            db.prepare('DELETE FROM active_tickets WHERE channel_id = ?').run(message.channel.id);

            await message.channel.delete();
        }
    }
};
