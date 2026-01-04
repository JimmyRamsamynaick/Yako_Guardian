const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');

module.exports = {
    handleLogInteraction: async (client, interaction) => {
        const { customId, values, guild } = interaction;
        const parts = customId.split('_');
        const action = parts[1]; // select, toggle, channel
        // log_select_GUILDID
        // log_toggle_GUILDID_TYPE
        // log_channel_GUILDID_TYPE

        const config = await getGuildConfig(guild.id);
        if (!config.logs) config.logs = {};

        let type;

        // 1. SELECT LOG TYPE (Menu)
        if (action === 'select') {
            type = values[0]; // mod, message, etc.
            await renderLogPanel(client, interaction, config, type);
        }

        // 2. TOGGLE LOG (Button)
        else if (action === 'toggle') {
            type = parts[3]; // log_toggle_GUILDID_TYPE
            
            if (!config.logs[type]) config.logs[type] = { enabled: false, ignoredUsers: [], ignoredRoles: [] };
            config.logs[type].enabled = !config.logs[type].enabled;
            
            await config.save();
            await renderLogPanel(client, interaction, config, type);
        }

        // 3. SET CHANNEL (Channel Select)
        else if (action === 'channel') {
            type = parts[3]; // log_channel_GUILDID_TYPE
            const channelId = values[0];
            
            if (!config.logs[type]) config.logs[type] = { enabled: false, ignoredUsers: [], ignoredRoles: [] };
            config.logs[type].channelId = channelId;
            config.logs[type].enabled = true; // Auto-enable
            
            await config.save();
            await renderLogPanel(client, interaction, config, type);
        }
    }
};

async function renderLogPanel(client, interaction, config, type) {
    const log = config.logs[type] || { enabled: false, channelId: null };
    const status = log.enabled ? await t('logs.interactive_enabled', interaction.guild.id) : await t('logs.interactive_disabled', interaction.guild.id);
    const channel = log.channelId ? `<#${log.channelId}>` : 'Aucun';

    const embed = createEmbed(
        await t('logs.interactive_title', interaction.guild.id, { type: type.toUpperCase() }),
        await t('logs.interactive_desc', interaction.guild.id, { status, channel }),
        'default'
    );

    // Button: Toggle
    const btnToggle = new ButtonBuilder()
        .setCustomId(`log_toggle_${interaction.guild.id}_${type}`)
        .setLabel(log.enabled ? 'Désactiver' : 'Activer')
        .setStyle(log.enabled ? ButtonStyle.Danger : ButtonStyle.Success);

    // Channel Select
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`log_channel_${interaction.guild.id}_${type}`)
        .setPlaceholder('Choisir un salon de logs')
        .setChannelTypes(ChannelType.GuildText);

    const row1 = new ActionRowBuilder().addComponents(channelSelect);
    const row2 = new ActionRowBuilder().addComponents(btnToggle);

    // Main Menu (Persistent)
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`log_select_${interaction.guild.id}`)
        .setPlaceholder('Changer de type de log')
        .addOptions([
            { label: 'Modération', value: 'mod', description: 'Logs de modération', emoji: '🔨', default: type === 'mod' },
            { label: 'Messages', value: 'message', description: 'Logs de messages', emoji: '💬', default: type === 'message' },
            { label: 'Vocal', value: 'voice', description: 'Logs vocaux', emoji: '🎤', default: type === 'voice' },
            { label: 'Boost', value: 'boost', description: 'Logs de boost', emoji: '🚀', default: type === 'boost' },
            { label: 'Rôles', value: 'role', description: 'Logs de rôles', emoji: '🛡️', default: type === 'role' },
            { label: 'Raid', value: 'raid', description: 'Logs anti-raid', emoji: '🚨', default: type === 'raid' },
            { label: 'Serveur', value: 'server', description: 'Logs serveur', emoji: '🏢', default: type === 'server' },
            { label: 'Membres', value: 'member', description: 'Logs membres', emoji: '👤', default: type === 'member' }
        ]);
    
    const rowMenu = new ActionRowBuilder().addComponents(menu);

    await interaction.update({ 
        embeds: [embed], 
        components: [rowMenu, row1, row2] 
    }); 
}
