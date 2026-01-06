const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');
const TwitchAlert = require('../database/models/TwitchAlert');
const { getGuildConfig } = require('../utils/mongoUtils');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function handleNotificationInteraction(client, interaction) {
    const { customId, guild, member } = interaction;
    const config = await getGuildConfig(guild.id);

    if (customId.startsWith('twitch_')) {
        await handleTwitchInteraction(client, interaction, config);
    } else if (customId.startsWith('join_')) {
        await handleJoinInteraction(client, interaction, config);
    } else if (customId.startsWith('leave_')) {
        await handleLeaveInteraction(client, interaction, config);
    }
}

async function handleTwitchInteraction(client, interaction, config) {
    const { customId } = interaction;
    const guildId = interaction.guildId;

    if (customId === 'twitch_home') {
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_toggle') {
        config.twitch.enabled = !config.twitch.enabled;
        await config.save();
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_add') {
        const modal = new ModalBuilder()
            .setCustomId('twitch_add_modal')
            .setTitle(await t('notifications.handler.twitch.add_modal_title', guildId));

        const nameInput = new TextInputBuilder()
            .setCustomId('streamer_name')
            .setLabel(await t('notifications.handler.twitch.name_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const channelInput = new TextInputBuilder()
            .setCustomId('discord_channel_id')
            .setLabel(await t('notifications.handler.twitch.channel_label', guildId))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(await t('notifications.handler.twitch.channel_placeholder', guildId))
            .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(channelInput));
        await interaction.showModal(modal);
    } else if (customId === 'twitch_add_modal') {
        let streamerName = interaction.fields.getTextInputValue('streamer_name').trim();
        let channelId = interaction.fields.getTextInputValue('discord_channel_id') || interaction.channelId;

        // Extract username from URL if provided
        // Supports: https://www.twitch.tv/username, twitch.tv/username, username
        const urlMatch = streamerName.match(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
        if (urlMatch) {
            streamerName = urlMatch[1];
        }

        // Verify channel
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
            const rowBack = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('twitch_home')
                        .setLabel(await t('notifications.handler.twitch.back_label', guildId))
                        .setStyle(ButtonStyle.Secondary)
                );
            return interaction.reply({ embeds: [createEmbed(await t('notifications.handler.twitch.invalid_channel', guildId), '', 'error')], components: [rowBack], ephemeral: true });
        }

        await TwitchAlert.create({
            guildId: interaction.guildId,
            channelName: streamerName,
            discordChannelId: channelId
        });

        const rowBack = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('twitch_home')
                    .setLabel(await t('notifications.handler.twitch.back_label', guildId))
                    .setStyle(ButtonStyle.Secondary)
            );
        await interaction.reply({ embeds: [createEmbed(await t('notifications.handler.twitch.added_success', guildId, { name: streamerName }), '', 'success')], components: [rowBack], ephemeral: true });
    } else if (customId === 'twitch_del_menu') {
        // Show select menu to delete
        const alerts = await TwitchAlert.find({ guildId: interaction.guildId });
        if (alerts.length === 0) {
            return interaction.reply({ embeds: [createEmbed(await t('notifications.handler.twitch.no_streamers', guildId), '', 'error')], ephemeral: true });
        }

        const options = await Promise.all(alerts.map(async alert => ({
            label: alert.channelName,
            description: await t('notifications.handler.twitch.channel_desc', guildId, { channel: `<#${alert.discordChannelId}>` }),
            value: alert._id.toString()
        })));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('twitch_delete_select')
                    .setPlaceholder(await t('notifications.handler.twitch.delete_placeholder', guildId))
                    .addOptions(options.slice(0, 25)) // Limit to 25
            );
        
        const rowBack = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('twitch_home')
                    .setLabel(await t('notifications.handler.twitch.back_label', guildId))
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ content: null, embeds: [createEmbed(await t('notifications.handler.twitch.delete_title', guildId), '', 'info')], components: [row, rowBack] });
    } else if (customId === 'twitch_delete_select') {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
        const alertId = interaction.values[0];
        await TwitchAlert.findByIdAndDelete(alertId);
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_list') {
        const alerts = await TwitchAlert.find({ guildId: interaction.guildId });
        
        const embed = createEmbed(await t('notifications.handler.twitch.list_title', guildId), '', 'info');
        
        if (alerts.length === 0) {
            embed.setDescription(await t('notifications.handler.twitch.list_empty', guildId));
        } else {
            const fields = await Promise.all(alerts.map(async (alert, index) => {
                let name = alert.channelName;
                // Clean name for display if it's a URL
                const match = name.match(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
                if (match) name = match[1];

                return {
                    name: `🎥 ${name}`,
                    value: `🔗 [Twitch](https://twitch.tv/${name}) -> <#${alert.discordChannelId}>`,
                    inline: true
                };
            }));
            
            embed.addFields(fields);
            embed.setThumbnail('https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png');
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function showTwitchMenu(interaction, config) {
    const guildId = interaction.guildId || interaction.guild.id;
    const isEnabled = config.twitch?.enabled;
    const status = isEnabled ? await t('notifications.handler.twitch.enabled', guildId) : await t('notifications.handler.twitch.disabled', guildId);
    const btnStyle = isEnabled ? ButtonStyle.Success : ButtonStyle.Danger;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('twitch_toggle')
                .setLabel(await t('notifications.handler.twitch.btn_system', guildId, { state: isEnabled ? 'ON' : 'OFF' }))
                .setStyle(btnStyle),
            new ButtonBuilder()
                .setCustomId('twitch_add')
                .setLabel(await t('notifications.handler.twitch.btn_add', guildId))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('twitch_del_menu')
                .setLabel(await t('notifications.handler.twitch.btn_del', guildId))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('twitch_list')
                .setLabel(await t('notifications.handler.twitch.btn_list', guildId))
                .setStyle(ButtonStyle.Secondary)
        );

    const content = await t('notifications.handler.twitch.config_title', guildId, { status });

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const channel = interaction.channel || interaction.client.channels.cache.get(interaction.channelId);
        await channel.send({ embeds: [createEmbed(content, '', 'info')], components: [row] });
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) { // Modal Submit or Component
         // If we replied ephemeral in modal submit, we can't update.
         if (interaction.replied) return; 
         await interaction.update({ content: null, embeds: [createEmbed(content, '', 'info')], components: [row] });
    } else {
        await interaction.reply({ embeds: [createEmbed(content, '', 'info')], components: [row], ephemeral: true });
    }
}

async function handleJoinInteraction(client, interaction, config) {
    const { customId } = interaction;
    const guildId = interaction.guildId;

    if (customId === 'join_home') {
        await showJoinMenu(interaction, config);
    } else if (customId === 'join_toggle') {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
        config.welcome.enabled = !config.welcome.enabled;
        await config.save();
        await showJoinMenu(interaction, config);
    } else if (customId === 'join_channel_select') {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
            config.welcome.channelId = interaction.values[0];
            await config.save();
            await showJoinMenu(interaction, config);
        } catch (error) {
            console.error('Error in join_channel_select:', error);
            // If we can't update the menu, try sending an ephemeral error if possible
            if (!interaction.replied) {
                 // Try to follow up
                 // But showJoinMenu might have failed.
            }
        }
    } else if (customId === 'join_message_btn') {
        const modal = new ModalBuilder()
            .setCustomId('join_message_modal')
            .setTitle(await t('notifications.handler.join.modal_title', guildId));

        const msgInput = new TextInputBuilder()
            .setCustomId('join_msg_input')
            .setLabel(await t('notifications.handler.join.msg_label', guildId))
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.welcome.message || await t('notifications.handler.join.default_message', guildId))
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        await interaction.showModal(modal);
    } else if (customId === 'join_message_modal') {
        const msg = interaction.fields.getTextInputValue('join_msg_input');
        config.welcome.message = msg;
        await config.save();

        const rowBack = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_home')
                    .setLabel(await t('notifications.handler.twitch.back_label', guildId))
                    .setStyle(ButtonStyle.Secondary)
            );
        await interaction.reply({ embeds: [createEmbed(await t('notifications.handler.join.msg_updated', guildId), '', 'success')], components: [rowBack], ephemeral: true });
    }
}

async function showJoinMenu(interaction, config) {
    const guildId = interaction.guildId || interaction.guild.id;
    const welcome = config.welcome;
    const status = welcome.enabled ? await t('notifications.handler.twitch.enabled', guildId) : await t('notifications.handler.twitch.disabled', guildId);
    const channel = welcome.channelId ? `<#${welcome.channelId}>` : await t('notifications.handler.common.undefined', guildId);
    const message = welcome.message || await t('notifications.handler.common.undefined', guildId);

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('join_toggle')
                .setLabel(welcome.enabled ? await t('notifications.handler.join.btn_toggle_off', guildId) : await t('notifications.handler.join.btn_toggle_on', guildId))
                .setStyle(welcome.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('join_message_btn')
                .setLabel(await t('notifications.handler.join.btn_edit', guildId))
                .setStyle(ButtonStyle.Primary)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('join_channel_select')
                .setPlaceholder(await t('notifications.handler.join.select_placeholder', guildId))
                .setChannelTypes(ChannelType.GuildText)
        );

    const content = await t('notifications.handler.join.config_title', guildId);
    const description = await t('notifications.handler.join.config_description', guildId);

    const embed = createEmbed(content, description, 'info', { guildId })
        .addFields([
            { name: await t('notifications.handler.join.status_field', guildId), value: status, inline: true },
            { name: await t('notifications.handler.join.channel_field', guildId), value: channel, inline: true },
            { name: await t('notifications.handler.join.message_field', guildId), value: `\`\`\`${message}\`\`\``, inline: false },
            { name: await t('notifications.handler.join.help_field', guildId), value: 'Variables: `{user}`, `{server}`', inline: false }
        ]);

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const channel = interaction.channel || interaction.client.channels.cache.get(interaction.channelId);
        await channel.send({ embeds: [embed], components: [rowControls, rowChannel] });
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) {
        if (!interaction.replied) await interaction.update({ content: null, embeds: [embed], components: [rowControls, rowChannel] });
    } else {
        await interaction.reply({ embeds: [embed], components: [rowControls, rowChannel], ephemeral: true });
    }
}

async function handleLeaveInteraction(client, interaction, config) {
    const { customId } = interaction;
    const guildId = interaction.guildId;

    if (customId === 'leave_home') {
        await showLeaveMenu(interaction, config);
    } else if (customId === 'leave_toggle') {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
        config.goodbye.enabled = !config.goodbye.enabled;
        await config.save();
        await showLeaveMenu(interaction, config);
    } else if (customId === 'leave_channel_select') {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
        config.goodbye.channelId = interaction.values[0];
        await config.save();
        await showLeaveMenu(interaction, config);
    } else if (customId === 'leave_message_btn') {
        const modal = new ModalBuilder()
            .setCustomId('leave_message_modal')
            .setTitle(await t('notifications.handler.leave.modal_title', guildId));

        const msgInput = new TextInputBuilder()
            .setCustomId('leave_msg_input')
            .setLabel(await t('notifications.handler.leave.msg_label', guildId))
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.goodbye.message || await t('notifications.handler.leave.default_message', guildId))
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        await interaction.showModal(modal);
    } else if (customId === 'leave_message_modal') {
        const msg = interaction.fields.getTextInputValue('leave_msg_input');
        config.goodbye.message = msg;
        await config.save();

        const rowBack = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leave_home')
                    .setLabel(await t('notifications.handler.twitch.back_label', guildId))
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [createEmbed(await t('notifications.handler.leave.msg_updated', guildId), '', 'success')], components: [rowBack], ephemeral: true });
    }
}

async function showLeaveMenu(interaction, config) {
    const guildId = interaction.guildId || interaction.guild.id;
    const goodbye = config.goodbye;
    const status = goodbye.enabled ? await t('notifications.handler.twitch.enabled', guildId) : await t('notifications.handler.twitch.disabled', guildId);
    const channel = goodbye.channelId ? `<#${goodbye.channelId}>` : await t('notifications.handler.common.undefined', guildId);
    const message = goodbye.message || await t('notifications.handler.common.undefined', guildId);

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leave_toggle')
                .setLabel(goodbye.enabled ? await t('notifications.handler.leave.btn_toggle_off', guildId) : await t('notifications.handler.leave.btn_toggle_on', guildId))
                .setStyle(goodbye.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('leave_message_btn')
                .setLabel(await t('notifications.handler.leave.btn_edit', guildId))
                .setStyle(ButtonStyle.Primary)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('leave_channel_select')
                .setPlaceholder(await t('notifications.handler.leave.select_placeholder', guildId))
                .setChannelTypes(ChannelType.GuildText)
        );

    const content = await t('notifications.handler.leave.config_title', guildId);
    const description = await t('notifications.handler.leave.config_description', guildId);

    const embed = createEmbed(content, description, 'info', { guildId })
        .addFields([
            { name: await t('notifications.handler.leave.status_field', guildId), value: status, inline: true },
            { name: await t('notifications.handler.leave.channel_field', guildId), value: channel, inline: true },
            { name: await t('notifications.handler.leave.message_field', guildId), value: `\`\`\`${message}\`\`\``, inline: false },
            { name: await t('notifications.handler.leave.help_field', guildId), value: 'Variables: `{user}`, `{server}`', inline: false }
        ]);

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const channel = interaction.channel || interaction.client.channels.cache.get(interaction.channelId);
        await channel.send({ embeds: [embed], components: [rowControls, rowChannel] });
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) {
        if (!interaction.replied) await interaction.update({ content: null, embeds: [embed], components: [rowControls, rowChannel] });
    } else {
        await interaction.reply({ embeds: [embed], components: [rowControls, rowChannel], ephemeral: true });
    }
}

module.exports = { handleNotificationInteraction, showTwitchMenu, showJoinMenu, showLeaveMenu };
