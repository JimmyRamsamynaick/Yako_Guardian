const { ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { createTicket } = require('../../utils/modmailUtils');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot) return;

        // --- DM HANDLING (User -> Bot) ---
        if (message.channel.type === ChannelType.DM) {
            // Check for existing active ticket
            const activeTicket = db.prepare('SELECT * FROM active_tickets WHERE user_id = ?').get(message.author.id);

            if (activeTicket) {
                // Forward to guild channel
                const guild = client.guilds.cache.get(activeTicket.guild_id);
                if (!guild) return message.reply("❌ Le serveur semble inaccessible.");

                const channel = guild.channels.cache.get(activeTicket.channel_id);
                if (!channel) {
                    // Channel deleted? Clean up
                    db.prepare('DELETE FROM active_tickets WHERE user_id = ? AND guild_id = ?').run(message.author.id, activeTicket.guild_id);
                    return message.reply("❌ Le ticket semble avoir été supprimé.");
                }

                const embed = new EmbedBuilder()
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(message.content || "*Fichier/Image*")
                    .setColor('#0099ff')
                    .setTimestamp();

                if (message.attachments.size > 0) {
                    embed.setImage(message.attachments.first().url);
                }

                try {
                    await channel.send({ embeds: [embed] });
                    await message.react('✅');
                } catch (e) {
                    message.reply("❌ Impossible d'envoyer le message.");
                }
                return;
            }

            // No active ticket: Find mutual guilds with modmail ON
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    const settings = db.prepare('SELECT modmail_enabled FROM guild_settings WHERE guild_id = ?').get(id);
                    if (settings && settings.modmail_enabled === 'on') {
                        mutualGuilds.push(guild);
                    }
                }
            }

            if (mutualGuilds.length === 0) {
                return message.reply("❌ Aucun serveur commun n'a le modmail activé.");
            }

            if (mutualGuilds.length === 1) {
                // Create ticket directly
                try {
                    await createTicket(client, message.author, mutualGuilds[0], message.content);
                    await message.reply(`✅ **Ticket ouvert sur ${mutualGuilds[0].name} !**\nUn membre du staff vous répondra bientôt.`);
                } catch (e) {
                    message.reply(`❌ Erreur: ${e.message}`);
                }
            } else {
                // Ask to choose
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('modmail_select_guild')
                            .setPlaceholder('Choisissez un serveur')
                            .addOptions(mutualGuilds.map(g => ({
                                label: g.name,
                                value: g.id,
                                description: `Ouvrir un ticket sur ${g.name}`
                            })).slice(0, 25)) // Max 25 options
                    );

                await message.reply({ 
                    content: "📨 **Choisissez le serveur à contacter :**", 
                    components: [row] 
                });
            }
            return;
        }

        // --- GUILD CHANNEL HANDLING (Staff -> User) ---
        if (message.guild) {
            // Check if this channel is an active ticket
            const ticket = db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?').get(message.channel.id);
            if (!ticket) return;

            // Ignore commands (starting with +)
            if (message.content.startsWith('+')) return;

            const user = await client.users.fetch(ticket.user_id).catch(() => null);
            if (!user) {
                return message.reply("❌ Utilisateur introuvable (a quitté Discord ?).");
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || "*Fichier/Image*")
                .setColor('#00ff00') // Green for staff
                .setTimestamp()
                .setFooter({ text: message.guild.name });

            if (message.attachments.size > 0) {
                embed.setImage(message.attachments.first().url);
            }

            try {
                await user.send({ embeds: [embed] });
                await message.react('✅');
            } catch (e) {
                message.reply("❌ Impossible d'envoyer le MP (Bloqué ?).");
            }
        }
    }
};
