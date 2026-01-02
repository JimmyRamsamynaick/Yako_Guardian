const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed, THEME } = require('../utils/design');

async function handleHelpMenu(client, interaction) {
    const { customId } = interaction;
    const guildId = interaction.guildId;

    if (customId === 'help_close') {
        try {
            await interaction.message.delete();
        } catch (e) {
            await interaction.deferUpdate();
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
        
        let embed;

        if (commands.size === 0) {
            embed = createEmbed(
                await t('help.category_title', guildId, { category: category.toUpperCase() }),
                await t('help.empty_category', guildId),
                'error'
            );
        } else {
            const description = [];
            
            for (const cmd of commands.values()) {
                let desc = await t(`${cmd.name}.description`, guildId);
                // Fallbacks
                if (desc === `${cmd.name}.description`) desc = cmd.description || await t('common.no_description', guildId);

                description.push(`**${prefix}${cmd.name}**\n> ${desc}`);
            }

            embed = createEmbed(
                await t('help.category_title', guildId, { category: category.toUpperCase() }),
                description.join('\n\n'),
                'default',
                { footer: await t('help.handler.select_footer', guildId) }
            );
        }

        try {
            await interaction.update({
                content: null,
                embeds: [embed],
                components: interaction.message.components
            });
        } catch (error) {
            console.error("Error updating help menu:", error);
        }
    }
}

module.exports = { handleHelpMenu };
