const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const ActiveTicket = require('../database/models/ActiveTicket');
const GuildConfig = require('../database/models/GuildConfig');
const { t } = require('./i18n');

async function createTicket(client, user, guild, initialContent) {
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config || !config.modmail || !config.modmail.enabled || !config.modmail.categoryId) {
        throw new Error(await t('modmail.not_configured', guild.id));
    }

    const category = guild.channels.cache.get(config.modmail.categoryId);
    if (!category) {
        throw new Error(await t('modmail.category_not_found', guild.id));
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

    if (config.modmail.staffRoleId) {
        channel.permissionOverwrites.create(config.modmail.staffRoleId, {
            ViewChannel: true,
            SendMessages: true
        });
    }

    // Create DB Entry
    await ActiveTicket.create({
        guildId: guild.id,
        channelId: channel.id,
        userId: user.id
    });

    // Send Initial Message (No Embeds)
    const content = await t('modmail.new_ticket', guild.id, { 
        user: user.id, 
        tag: user.tag, 
        id: user.id, 
        content: initialContent || "*Aucun message*" 
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('modmail_claim')
                .setLabel(await t('modmail.btn_claim', guild.id))
                .setEmoji('🙋‍♂️')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('modmail_close')
                .setLabel(await t('modmail.btn_close', guild.id))
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );
    
    await channel.send({ content: "@here", components: [row] }); // Notify staff
    await channel.send({ content: content });

    return channel;
}

module.exports = { createTicket };
