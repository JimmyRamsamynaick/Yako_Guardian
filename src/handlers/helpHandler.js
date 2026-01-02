const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { updateV2Interaction, replyV2Interaction, extractActionRows } = require('../utils/componentUtils');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');

async function handleHelpMenu(client, interaction) {
    const { customId } = interaction;
    const guildId = interaction.guildId;

    if (customId === 'help_close') {
        try {
            await interaction.message.delete();
        } catch (e) {
            await updateV2Interaction(client, interaction, await t('help.handler.closed', guildId), []);
        }
        return;
    }

    const isSelect = interaction.isStringSelectMenu() && customId === 'help_select_category';
    const isButton = interaction.isButton() && customId.startsWith('help_btn_');

    if (isSelect || isButton) {
        let category = isSelect ? interaction.values[0] : customId.replace('help_btn_', 'help_');
        category = category.replace('help_', '');

        // Normalize category names
        const categoryMap = {
            'config': 'configuration',
            'admin': 'administration'
        };
        category = categoryMap[category] || category;

        const config = await getGuildConfig(interaction.guildId);
        const prefix = config.prefix || client.config.prefix;
        
        // Dynamic command list generation
        const commands = client.commands.filter(c => (c.category ? c.category.toLowerCase() : '') === category.toLowerCase());
        let content = '';

        if (commands.size === 0) {
            content = await t('help.empty_category', guildId);
        } else {
            content = await t('help.category_title', guildId, { category: category.toUpperCase() }) + "\n\n";
            
            for (const cmd of commands.values()) {
                // Try to fetch translated description and usage
                // Since JSON is flattened, we look for 'commandName.description' and 'commandName.usage'
                let description = await t(`${cmd.name}.description`, guildId);
                let usage = await t(`${cmd.name}.usage`, guildId);

                // Fallbacks
                if (description === `${cmd.name}.description`) description = cmd.description || await t('common.no_description', guildId);
                if (usage === `${cmd.name}.usage`) usage = cmd.usage || '';

                content += `> **${prefix}${cmd.name}**\n`;
                if (usage) content += `> ${usage}\n`;
                content += `> ${description}\n\n`;
            }
        }

        const components = extractActionRows(interaction.message.components);
        
        try {
            await updateV2Interaction(
                client, 
                interaction, 
                content + '\n' + await t('help.handler.select_footer', guildId), 
                components
            );
        } catch (error) {
            console.error("Error updating V2 help:", error);
        }
    }
}

module.exports = { handleHelpMenu };
