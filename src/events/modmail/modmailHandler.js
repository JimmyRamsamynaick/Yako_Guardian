const { ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ActiveTicket = require('../../database/models/ActiveTicket');
const GuildConfig = require('../../database/models/GuildConfig');
const { createTicket } = require('../../utils/modmailUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot) return;

        // --- DM HANDLING (User -> Bot) ---
        if (message.channel.type === ChannelType.DM) {
            // Check for existing active ticket
            const activeTicket = await ActiveTicket.findOne({ userId: message.author.id, closed: false });

            if (activeTicket) {
                // Forward to guild channel
                const guild = client.guilds.cache.get(activeTicket.guildId);
                if (!guild) return sendV2Message(client, message.channel.id, "❌ Le serveur semble inaccessible.", []);

                const channel = guild.channels.cache.get(activeTicket.channelId);
                if (!channel) {
                    // Channel deleted? Clean up
                    activeTicket.closed = true;
                    await activeTicket.save();
                    return sendV2Message(client, message.channel.id, "❌ Le ticket semble avoir été fermé.", []);
                }

                let content = `**${message.author.tag}**: ${message.content}`;
                if (message.attachments.size > 0) {
                    content += `\n[Pièce jointe](${message.attachments.first().url})`;
                }

                try {
                    await channel.send({ content });
                    await message.react('✅');
                } catch (e) {
                    sendV2Message(client, message.channel.id, "❌ Impossible d'envoyer le message.", []);
                }
                return;
            }

            // No active ticket: Find mutual guilds with modmail ON
            const mutualGuilds = [];
            for (const [id, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    const config = await getGuildConfig(id);
                    if (config && config.modmail && config.modmail.enabled) {
                        mutualGuilds.push(guild);
                    }
                }
            }

            if (mutualGuilds.length === 0) {
                return sendV2Message(client, message.channel.id, "❌ Aucun serveur commun n'a le modmail activé.", []);
            }

            if (mutualGuilds.length === 1) {
                // Create ticket directly
                try {
                    await createTicket(client, message.author, mutualGuilds[0], message.content);
                    sendV2Message(client, message.channel.id, `✅ **Ticket ouvert sur ${mutualGuilds[0].name} !**\nUn membre du staff vous répondra bientôt.`, []);
                } catch (e) {
                    sendV2Message(client, message.channel.id, `❌ Erreur: ${e.message}`, []);
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
                            })).slice(0, 25))
                    );

                await sendV2Message(client, message.channel.id, "📨 **Choisissez le serveur à contacter :**", [row]);
            }
            return;
        }

        // --- GUILD CHANNEL HANDLING (Staff -> User) ---
        if (message.guild) {
            // Check if this channel is an active ticket
            const ticket = await ActiveTicket.findOne({ channelId: message.channel.id, closed: false });
            if (!ticket) return;

            // Ignore commands
            if (message.content.startsWith('+')) return; // Simple check, ideally check actual prefix

            // Forward to User
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            if (!user) {
                return message.channel.send("❌ Utilisateur introuvable (a quitté le serveur ?).");
            }

            let content = `**Staff (${message.guild.name})**: ${message.content}`;
            if (message.attachments.size > 0) {
                content += `\n[Pièce jointe](${message.attachments.first().url})`;
            }

            try {
                await user.send(content);
                await message.react('✅');
            } catch (e) {
                message.channel.send("❌ Impossible d'envoyer le message en DM (Bloqué ?).");
            }
        }
    }
};
