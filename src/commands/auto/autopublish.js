const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'autopublish',
    description: 'Configure la publication automatique',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('autopublish.permission', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        await showAutoPublishMenu(client, message, config);
    }
};

async function showAutoPublishMenu(client, interaction, config) {
    const enabled = config.autoPublish || false;
    const channels = config.autoPublishChannels || [];
    const guildId = interaction.guild ? interaction.guild.id : (interaction.guildId || interaction.channel.guild.id);
    
    const status = enabled ? await t('autopublish.status_on', guildId) : await t('autopublish.status_off', guildId);
    const channelList = channels.length > 0 ? channels.map(c => `<#${c}>`).join(', ') : await t('autopublish.channels_none', guildId);
    
    const content = (await t('autopublish.menu_title', guildId)) + `\n\n` +
                    `${status}\n` +
                    `${channelList}\n\n` +
                    (await t('autopublish.description', guildId));
                    
    const rowControls = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('autopublish_toggle')
                .setLabel(enabled ? await t('autopublish.btn_disable', guildId) : await t('autopublish.btn_enable', guildId))
                .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const rowChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('autopublish_channel_select')
                .setPlaceholder(await t('autopublish.placeholder', guildId))
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

