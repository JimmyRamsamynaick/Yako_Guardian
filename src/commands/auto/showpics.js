const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../../utils/componentUtils');

module.exports = {
    name: 'show',
    description: 'Commandes d\'affichage automatique',
    async execute(client, message, args) {
        if (args[0] === 'pics') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showPfpMenu(client, message, config);
        }
    }
};

async function showPfpMenu(client, interaction, config) {
    const pfp = config.pfp || { enabled: false };
    const status = pfp.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = pfp.channelId ? `<#${pfp.channelId}>` : "Non défini";

    const content = `**🖼️ Configuration Show Pics**\n\n` +
                    `État : **${status}**\n` +
                    `Salon : ${channel}\n\n` +
                    `Envoie automatiquement des photos de profils aléatoires des membres toutes les heures.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pfp_toggle')
                .setLabel(pfp.enabled ? 'Désactiver' : 'Activer')
                .setStyle(pfp.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('pfp_channel_select')
                .setPlaceholder('Choisir le salon')
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await updateV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    } else {
        // Command (message) or initial reply
        // Check if it's a message or interaction
        if (interaction.channelId) {
             await sendV2Message(client, interaction.channelId, content, [rowControls, rowChannel]);
        } else {
             // Fallback if interaction but not updating (e.g. slash command reply?)
             // But here it's likely message or update
             await replyV2Interaction(client, interaction, content, [rowControls, rowChannel]);
        }
    }
}

// Export for handler
module.exports.showPfpMenu = showPfpMenu;
