const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'show',
    description: 'Commandes d\'affichage automatique',
    category: 'Automation',
    async execute(client, message, args) {
        if (!args[0]) {
            const embed = createEmbed(
                await t('showpics.help_title', message.guild.id),
                await t('showpics.help_description', message.guild.id),
                'info'
            );
            embed.addFields({ 
                name: 'Commandes', 
                value: await t('showpics.help_cmd_pics', message.guild.id) 
            });
            return message.channel.send({ embeds: [embed] });
        }
        if (args[0] === 'pics') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('showpics.permission', message.guild.id), '', 'error')] });
            }

            const config = await getGuildConfig(message.guild.id);
            await showPfpMenu(client, message, config);
        }
    }
};

async function showPfpMenu(client, interaction, config) {
    const pfp = config.pfp || { enabled: false };
    const guildId = interaction.guild ? interaction.guild.id : (interaction.guildId || interaction.channel.guild.id);
    const status = pfp.enabled ? await t('showpics.status_on', guildId) : await t('showpics.status_off', guildId);
    const channel = pfp.channelId ? `<#${pfp.channelId}>` : await t('showpics.channel_undefined', guildId);

    const description = (await t('showpics.menu_title', guildId)) + `\n\n` +
                    `${status}\n` +
                    `${channel}\n\n` +
                    (await t('showpics.description', guildId));

    const embed = createEmbed(description, '', 'info');

    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pfp_toggle')
                .setLabel(pfp.enabled ? await t('showpics.btn_disable', guildId) : await t('showpics.btn_enable', guildId))
                .setStyle(pfp.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('pfp_channel_select')
                .setPlaceholder(await t('showpics.placeholder', guildId))
                .setChannelTypes(ChannelType.GuildText)
        );

    if (interaction.isMessageComponent && interaction.isMessageComponent()) {
        await interaction.update({ embeds: [embed], components: [rowControls, rowChannel] });
    } else {
        // Command (message)
        if (interaction.channel) {
             await interaction.channel.send({ embeds: [embed], components: [rowControls, rowChannel] });
        }
    }
}

// Export for handler
module.exports.showPfpMenu = showPfpMenu;
