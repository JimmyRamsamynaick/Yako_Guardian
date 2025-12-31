const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mp',
    description: 'Gestion des messages privés et interactions',
    category: 'Owner',
    aliases: ['discussion'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // --- +MP COMMANDS ---
        if (commandName === 'mp') {
            const sub = args[0];

            // +mp settings
            if (sub === 'settings') {
                // Toggle global MP reception (Modmail)
                const settings = await GlobalSettings.findOne({ clientId: client.user.id });
                const currentStatus = settings?.mpEnabled ?? true; // Default true

                // Simple toggle for now, or maybe a menu later
                // If user provided on/off
                if (args[1]) {
                    const newState = args[1].toLowerCase() === 'on';
                    await GlobalSettings.findOneAndUpdate(
                        { clientId: client.user.id },
                        { mpEnabled: newState },
                        { upsert: true, new: true }
                    );
                    return sendV2Message(client, message.channel.id, `✅ **MP Settings**\nLa réception de MP (Modmail global) est maintenant **${newState ? 'ACTIVÉE' : 'DÉSACTIVÉE'}**.`, []);
                }

                return sendV2Message(client, message.channel.id, `⚙️ **MP Settings**\nÉtat actuel: **${currentStatus ? 'ON' : 'OFF'}**\nUsage: \`+mp settings <on/off>\``, []);
            }

            // +mp <user> <message>
            const targetId = args[0];
            const content = args.slice(1).join(' ');

            if (!targetId || !content) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+mp <ID/Mention> <Message>` ou `+mp settings`", []);
            }

            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);

            if (!user) {
                return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);
            }

            try {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `Message de l'équipe ${client.user.username}`, iconURL: client.user.displayAvatarURL() })
                    .setDescription(content)
                    .setColor('#0099ff')
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                return sendV2Message(client, message.channel.id, `✅ Message envoyé à **${user.tag}** via le bot.`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Impossible d'envoyer le MP: ${e.message}`, []);
            }
        }

        // --- +DISCUSSION ---
        if (commandName === 'discussion') {
            // Discussion inter-serveur via le bot
            // This interprets as: "Connect to a user's DM session"
            
            const targetId = args[0];
            if (!targetId) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+discussion <ID/User>`\n*(Ouvre une session de chat avec l'utilisateur)*", []);
            }
            
            const userId = targetId.replace(/[<@!>]/g, '');
            const user = await client.users.fetch(userId).catch(() => null);
            
            if (!user) return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);

            // Check if there's already a ticket? 
            // Or just inform the owner they can reply via +mp?
            // "Discussion inter-serveur" might imply creating a channel bound to this user.
            
            // For now, let's just show info about the user and their mutual servers
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                if (guild.members.cache.has(userId)) mutualGuilds.push(guild.name);
            }

            const embed = new EmbedBuilder()
                .setTitle(`👤 Discussion: ${user.tag}`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: 'ID', value: user.id, inline: true },
                    { name: 'Création', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Serveurs communs', value: mutualGuilds.join(', ') || 'Aucun', inline: false }
                )
                .setDescription("Pour répondre, utilisez `+mp <ID> <Message>`.\n*(Le système de session en direct arrivera dans une future mise à jour v2)*")
                .setColor('#2b2d31');

            return sendV2Message(client, message.channel.id, "", [], [embed]);
        }
    }
};
