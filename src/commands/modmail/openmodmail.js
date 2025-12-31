const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'openmodmail',
    description: 'Ouvrir un ticket Modmail avec un membre',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return sendV2Message(client, message.channel.id, "❌ Permission refusée.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+openmodmail <@membre>`", []);
        }

        // Check if category exists or create one
        let category = message.guild.channels.cache.find(c => c.name === 'Modmail' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await message.guild.channels.create({
                name: 'Modmail',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: message.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: message.member.roles.highest.id, // Better logic needed for Staff role
                        allow: [PermissionFlagsBits.ViewChannel],
                    }
                ]
            });
        }

        // Create channel
        const channel = await message.guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: message.author.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('Modmail Ouvert')
            .setDescription(`Ticket ouvert avec ${member} par ${message.author}.\n\nVous pouvez discuter ici.`)
            .setColor('#5865F2')
            .setTimestamp();

        await channel.send({ content: `${member} ${message.author}`, embeds: [embed] });
        
        sendV2Message(client, message.channel.id, `✅ Modmail ouvert : ${channel}`, []);
    }
};