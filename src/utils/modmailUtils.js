const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const ActiveTicket = require('../database/models/ActiveTicket');
const GuildConfig = require('../database/models/GuildConfig');

async function createTicket(client, user, guild, initialContent) {
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config || !config.modmail || !config.modmail.enabled || !config.modmail.categoryId) {
        throw new Error("Le système Modmail n'est pas configuré sur ce serveur.");
    }

    const category = guild.channels.cache.get(config.modmail.categoryId);
    if (!category) {
        throw new Error("La catégorie Modmail est introuvable.");
    }

    const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: user.id,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: guild.members.me.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages],
            },
            {
                id: config.modmail.staffRoleId || guild.id, // If no staff role, allow everyone? No, better to default to just bot if undefined, but user wants staff.
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }
        ]
    });

    // Create DB Entry
    await ActiveTicket.create({
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id
    });

    // Send Initial Message (No Embeds)
    const content = `📨 **Nouveau Ticket**\n` +
                    `Utilisateur: <@${user.id}> (${user.tag})\n` +
                    `ID: ${user.id}\n\n` +
                    `**Message:**\n${initialContent || "*Aucun message*"}`;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('modmail_close')
                .setLabel('Fermer le Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );
    
    await channel.send({ content: "@here", components: [row] }); // Notify staff
    await channel.send({ content: content });

    return channel;
}

module.exports = { createTicket };
