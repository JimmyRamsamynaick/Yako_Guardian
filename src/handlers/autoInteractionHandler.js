const { showPfpMenu } = require('../commands/auto/showpics');
const { showAutoPublishMenu } = require('../commands/auto/autopublish');
const { getGuildConfig } = require('../utils/mongoUtils');

async function handleAutoInteraction(client, interaction) {
    const { customId, guild } = interaction;
    const config = await getGuildConfig(guild.id);

    if (customId === 'pfp_toggle') {
        config.pfp.enabled = !config.pfp.enabled;
        await config.save();
        await showPfpMenu(client, interaction, config);
    } else if (customId === 'pfp_channel_select') {
        config.pfp.channelId = interaction.values[0];
        await config.save();
        await showPfpMenu(client, interaction, config);
    } else if (customId === 'autopublish_toggle') {
        config.autoPublish = !config.autoPublish;
        await config.save();
        await showAutoPublishMenu(client, interaction, config);
    } else if (customId === 'autopublish_channel_select') {
        config.autoPublishChannels = interaction.values;
        await config.save();
        await showAutoPublishMenu(client, interaction, config);
    }
}

module.exports = { handleAutoInteraction };
