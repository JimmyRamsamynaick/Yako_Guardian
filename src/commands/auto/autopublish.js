const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../../utils/componentUtils');

module.exports = {
    name: 'autopublish',
    description: 'Configure la publication automatique',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const config = await getGuildConfig(message.guild.id);
        await showAutoPublishMenu(client, message, config);
    }
};

async function showAutoPublishMenu(client, interaction, config) {
    const enabled = config.autoPublish || false;
    const channels = config.autoPublishChannels || [];
    
    const status = enabled ? "✅ Globalement Activé" : "❌ Globalement Désactivé";
    const channelList = channels.length > 0 ? channels.map(c => `<#${c}>`).join(', ') : "Aucun salon spécifique (Tout publier si activé globalement ?)";
    
    const content = `**📢 Configuration Auto-Publish**\n\n` +
                    `État : **${status}**\n` +
                    `Salons ciblés : ${channelList}\n\n` +
                    `Si activé, le bot publiera automatiquement les messages dans les salons d'annonces (crosspost).\n` +
                    `Si aucun salon n'est sélectionné, cela s'appliquera à **tous** les salons d'annonces.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('autopublish_toggle')
                .setLabel(enabled ? 'Désactiver' : 'Activer')
                .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('autopublish_channel_select')
                .setPlaceholder('Choisir les salons (optionnel)')
                .setChannelTypes(ChannelType.GuildAnnouncement)
                .setMinValues(0)
                .setMaxValues(25)
        );

    if (interaction.type === 3) { // Component interaction
        await updateV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    } else {
        await sendV2Message(client, interaction.channel.id, content, [rowControls, rowChannel]);
    }
}

module.exports.showAutoPublishMenu = showAutoPublishMenu;

