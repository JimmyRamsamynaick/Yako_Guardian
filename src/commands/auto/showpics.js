const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'show',
    description: 'Commandes d\'affichage automatique',
    async execute(client, message, args) {
        if (!args[0]) {
            return sendV2Message(client, message.channel.id, await t('showpics.usage', message.guild.id), []);
        }
        if (args[0] === 'pics') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return sendV2Message(client, message.channel.id, await t('showpics.permission', message.guild.id), []);
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

    const content = (await t('showpics.menu_title', guildId)) + `\n\n` +
                    `${status}\n` +
                    `${channel}\n\n` +
                    (await t('showpics.description', guildId));

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
