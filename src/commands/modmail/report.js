const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction } = require('../../utils/componentUtils');

module.exports = {
    name: 'report',
    description: 'Configure le système de Report',
    async execute(client, message, args) { // Added client parameter
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
            }

            const config = await getGuildConfig(message.guild.id);
            await showReportMenu(client, message, config);
        } else {
            sendV2Message(client, message.channel.id, "Utilisation: `+report settings`", []);
        }
    }
};

async function showReportMenu(client, interaction, config) {
    const report = config.report || { enabled: false, channelId: null };
    const status = report.enabled ? "✅ Activé" : "❌ Désactivé";
    const channel = report.channelId ? `<#${report.channelId}>` : "Non défini";

    const content = `**🚨 Configuration Report**\n\n` +
                    `État : **${status}**\n` +
                    `Salon de logs : ${channel}\n\n` +
                    `Permet aux utilisateurs de signaler des messages via Clic Droit > Applications > Report Message.`;

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('report_toggle')
                .setLabel(report.enabled ? 'Désactiver' : 'Activer')
                .setStyle(report.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('report_channel_select')
                .setPlaceholder('Choisir le salon de logs')
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.type === 3) { // Component Interaction
        await updateV2Interaction(client, interaction, content, [rowControls, rowChannel]);
    } else {
        // Message Command
        // For messages, interaction is the message object.
        await sendV2Message(client, interaction.channel.id, content, [rowControls, rowChannel]);
    }
}
