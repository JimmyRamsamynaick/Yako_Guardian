const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'report',
    description: 'Configure le système de Report',
    async execute(client, message, args) { // Added client parameter
        if (args[0] === 'settings') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('report.permission', message.guild.id), '', 'error')] });
            }

            const config = await getGuildConfig(message.guild.id);
            await showReportMenu(client, message, config);
        } else {
            message.channel.send({ embeds: [createEmbed(await t('report.usage', message.guild.id), '', 'info')] });
        }
    }
};

async function showReportMenu(client, interaction, config) {
    const report = config.report || { enabled: false, channelId: null };
    const status = report.enabled ? await t('modmail.report.state_active', interaction.guild.id) : await t('modmail.report.state_inactive', interaction.guild.id);
    const channel = report.channelId ? `<#${report.channelId}>` : "Non défini";

    const content = await t('modmail.report.title', interaction.guild.id) + "\n\n" +
                    await t('modmail.report.state', interaction.guild.id, { status }) + "\n" +
                    await t('modmail.report.logs', interaction.guild.id, { channel }) + "\n\n" +
                    await t('modmail.report.description', interaction.guild.id);

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('report_toggle')
                .setLabel(report.enabled ? await t('modmail.report.btn_deactivate', interaction.guild.id) : await t('modmail.report.btn_activate', interaction.guild.id))
                .setStyle(report.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('report_channel_select')
                .setPlaceholder(await t('modmail.report.placeholder', interaction.guild.id))
                .setChannelTypes(ChannelType.GuildText)
        );

    const embed = createEmbed(content, '', 'info');

    if (interaction.type === 3) { // Component Interaction
        await interaction.update({ embeds: [embed], components: [rowControls, rowChannel] });
    } else {
        // Message Command
        // For messages, interaction is the message object.
        await interaction.channel.send({ embeds: [embed], components: [rowControls, rowChannel] });
    }
}
