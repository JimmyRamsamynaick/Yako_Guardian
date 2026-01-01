const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');
const TwitchAlert = require('../database/models/TwitchAlert');
const { getGuildConfig } = require('../utils/mongoUtils');
const { updateV2Interaction, replyV2Interaction } = require('../utils/componentUtils');

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

    if (customId === 'twitch_home') {
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_toggle') {
        config.twitch.enabled = !config.twitch.enabled;
        await config.save();
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_add') {
        const modal = new ModalBuilder()
            .setCustomId('twitch_add_modal')
            .setTitle('Ajouter un streamer');

        const nameInput = new TextInputBuilder()
            .setCustomId('streamer_name')
            .setLabel("Nom de la chaîne Twitch")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const channelInput = new TextInputBuilder()
            .setCustomId('discord_channel_id')
            .setLabel("ID du salon Discord (Optionnel)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Laisser vide pour utiliser le salon actuel")
            .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(channelInput));
        await interaction.showModal(modal);
    } else if (customId === 'twitch_add_modal') {
        const streamerName = interaction.fields.getTextInputValue('streamer_name');
        let channelId = interaction.fields.getTextInputValue('discord_channel_id') || interaction.channelId;

        // Verify channel
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
            return replyV2Interaction(client, interaction, "⚠️ Salon invalide.", [], true);
        }

        await TwitchAlert.create({
            guildId: interaction.guildId,
            channelName: streamerName,
            discordChannelId: channelId
        });

        await replyV2Interaction(client, interaction, `✅ Streamer **${streamerName}** ajouté avec succès !`, [], true);
        // await showTwitchMenu(interaction, config); // Refresh menu if possible, but interaction is already replied. 
        // We can't edit the original message easily if we replied ephemeral. 
        // But the user can click "Retour" or "Actualiser" if we add one.
    } else if (customId === 'twitch_del_menu') {
        // Show select menu to delete
        const alerts = await TwitchAlert.find({ guildId: interaction.guildId });
        if (alerts.length === 0) {
            return replyV2Interaction(client, interaction, "⚠️ Aucun streamer configuré.", [], true);
        }

        const options = alerts.map(alert => ({
            label: alert.channelName,
            description: `Salon: <#${alert.discordChannelId}>`,
            value: alert._id.toString()
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('twitch_delete_select')
                    .setPlaceholder('Sélectionner un streamer à supprimer')
                    .addOptions(options.slice(0, 25)) // Limit to 25
            );
        
        const rowBack = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('twitch_home')
                    .setLabel('Retour')
                    .setStyle(ButtonStyle.Secondary)
            );

        await updateV2Interaction(interaction.client, interaction, "🗑️ **Supprimer un streamer**", [row, rowBack]);
    } else if (customId === 'twitch_delete_select') {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
        const alertId = interaction.values[0];
        await TwitchAlert.findByIdAndDelete(alertId);
        await showTwitchMenu(interaction, config);
    } else if (customId === 'twitch_list') {
        const alerts = await TwitchAlert.find({ guildId: interaction.guildId });
        let content = "**📺 Liste des streamers suivis :**\n\n";
        if (alerts.length === 0) content += "Aucun streamer configuré.";
        else {
            alerts.forEach(alert => {
                content += `• **${alert.channelName}** -> <#${alert.discordChannelId}>\n`;
            });
        }
        
        await replyV2Interaction(client, interaction, content, [], true);
    }
}

async function showTwitchMenu(interaction, config) {
    const isEnabled = config.twitch?.enabled;
    const status = isEnabled ? "✅ Activé" : "❌ Désactivé";
    const btnStyle = isEnabled ? ButtonStyle.Success : ButtonStyle.Danger;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('twitch_toggle')
                .setLabel(`Système: ${isEnabled ? 'ON' : 'OFF'}`)
                .setStyle(btnStyle),
            new ButtonBuilder()
                .setCustomId('twitch_add')
                .setLabel('Ajouter Streamer')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('twitch_del_menu')
                .setLabel('Supprimer Streamer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('twitch_list')
                .setLabel('Voir Liste')
                .setStyle(ButtonStyle.Secondary)
        );

    const content = `**🟣 Configuration Twitch**\n\nÉtat du système : **${status}**\n\nConfigurez ici les alertes de stream Twitch.`;

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const { sendV2Message } = require('../utils/componentUtils');
        await sendV2Message(interaction.client, interaction.channelId, content, [row]);
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) { // Modal Submit or Component
         // If we replied ephemeral in modal submit, we can't update.
         if (interaction.replied) return; 
         await updateV2Interaction(interaction.client, interaction, content, [row]);
    } else {
        await replyV2Interaction(interaction.client, interaction, content, [row]);
    }
}

async function handleJoinInteraction(client, interaction, config) {
    const { customId } = interaction;

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
            .setTitle('Message de bienvenue');

        const msgInput = new TextInputBuilder()
            .setCustomId('join_msg_input')
            .setLabel("Message (Variables: {user}, {server})")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.welcome.message || "Bienvenue {user} sur {server} !")
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        await interaction.showModal(modal);
    } else if (customId === 'join_message_modal') {
        const msg = interaction.fields.getTextInputValue('join_msg_input');
        config.welcome.message = msg;
        await config.save();
        await replyV2Interaction(client, interaction, "✅ Message de bienvenue mis à jour !", [], true);
    }
}

async function showJoinMenu(interaction, config) {
    const welcome = config.welcome;
    const status = welcome.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = welcome.channelId ? `<#${welcome.channelId}>` : "Non défini";
    const message = welcome.message || "Non défini";

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('join_toggle')
                .setLabel(welcome.enabled ? 'Désactiver' : 'Activer')
                .setStyle(welcome.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('join_message_btn')
                .setLabel('Modifier Message')
                .setStyle(ButtonStyle.Primary)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('join_channel_select')
                .setPlaceholder('Choisir le salon de bienvenue')
                .setChannelTypes(ChannelType.GuildText)
        );

    const content = `**👋 Configuration Arrivées (Welcome)**\n\n` +
                    `État : **${status}**\n` +
                    `Salon : ${channel}\n` +
                    `Message : \n\`\`\`${message}\`\`\``;

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const { sendV2Message } = require('../utils/componentUtils');
        await sendV2Message(interaction.client, interaction.channelId, content, [rowControls, rowChannel]);
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) {
        if (!interaction.replied) await updateV2Interaction(interaction.client, interaction, content, [rowControls, rowChannel]);
    } else {
        await replyV2Interaction(interaction.client, interaction, content, [rowControls, rowChannel]);
    }
}

async function handleLeaveInteraction(client, interaction, config) {
    const { customId } = interaction;

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
            .setTitle('Message de départ');

        const msgInput = new TextInputBuilder()
            .setCustomId('leave_msg_input')
            .setLabel("Message (Variables: {user}, {server})")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.goodbye.message || "Au revoir {user} !")
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        await interaction.showModal(modal);
    } else if (customId === 'leave_message_modal') {
        const msg = interaction.fields.getTextInputValue('leave_msg_input');
        config.goodbye.message = msg;
        await config.save();
        await replyV2Interaction(client, interaction, "✅ Message de départ mis à jour !", [], true);
    }
}

async function showLeaveMenu(interaction, config) {
    const goodbye = config.goodbye;
    const status = goodbye.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = goodbye.channelId ? `<#${goodbye.channelId}>` : "Non défini";
    const message = goodbye.message || "Non défini";

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leave_toggle')
                .setLabel(goodbye.enabled ? 'Désactiver' : 'Activer')
                .setStyle(goodbye.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('leave_message_btn')
                .setLabel('Modifier Message')
                .setStyle(ButtonStyle.Primary)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('leave_channel_select')
                .setPlaceholder('Choisir le salon de départ')
                .setChannelTypes(ChannelType.GuildText)
        );

    const content = `**👋 Configuration Départs (Goodbye)**\n\n` +
                    `État : **${status}**\n` +
                    `Salon : ${channel}\n` +
                    `Message : \n\`\`\`${message}\`\`\``;

    // Handle Message object (legacy command)
    if (!interaction.token) {
        const { sendV2Message } = require('../utils/componentUtils');
        await sendV2Message(interaction.client, interaction.channelId, content, [rowControls, rowChannel]);
        return;
    }

    if (interaction.type === 5 || interaction.type === 3) {
        if (!interaction.replied) await updateV2Interaction(interaction.client, interaction, content, [rowControls, rowChannel]);
    } else {
        await replyV2Interaction(interaction.client, interaction, content, [rowControls, rowChannel]);
    }
}

module.exports = { handleNotificationInteraction, showTwitchMenu, showJoinMenu, showLeaveMenu };
