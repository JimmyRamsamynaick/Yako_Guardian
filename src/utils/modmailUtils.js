const { ChannelType, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../database');

async function createTicket(client, user, guild, initialContent) {
    const settings = db.prepare('SELECT modmail_category FROM guild_settings WHERE guild_id = ?').get(guild.id);
    if (!settings || !settings.modmail_category) {
        throw new Error("Configuration modmail invalide sur ce serveur.");
    }

    const category = guild.channels.cache.get(settings.modmail_category);
    if (!category) {
        throw new Error("La catégorie modmail n'existe plus sur ce serveur.");
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
            }
        ]
    });

    db.prepare('INSERT INTO active_tickets (user_id, guild_id, channel_id) VALUES (?, ?, ?)')
      .run(user.id, guild.id, channel.id);

    const embed = new EmbedBuilder()
        .setTitle(`Nouveau Ticket : ${user.tag}`)
        .setDescription(`**Message Initial:**\n${initialContent || "*Aucun message*"}`)
        .setThumbnail(user.displayAvatarURL())
        .setColor('Gold')
        .setFooter({ text: `ID: ${user.id}` });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('modmail_close')
                .setLabel('Fermer le Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );
    
    await channel.send({ content: "@here", embeds: [embed], components: [row] });
    return channel;
}

module.exports = { createTicket };
