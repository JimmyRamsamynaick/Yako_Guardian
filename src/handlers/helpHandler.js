const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed, THEME } = require('../utils/design');
const { getUserLevel, getCommandLevel } = require('../utils/permissionUtils');
const { isBotOwner } = require('../utils/ownerUtils');

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

    // --- HELP ALL (By Level) HANDLER ---
    if (customId === 'helpall_select_level') {
        const levelValue = interaction.values[0].replace('helpall_', '');
        const targetLevel = parseInt(levelValue);
        
        const config = await getGuildConfig(interaction.guildId);
        const prefix = config.prefix || client.config.prefix;
        
        // Filter commands by exact level
        const commands = client.commands.filter(c => getCommandLevel(c) === targetLevel);
        const sortedCommands = [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));

        if (sortedCommands.length === 0) {
            return interaction.update({
                embeds: [createEmbed(await t('helpall.level_title', guildId, { level: targetLevel }), await t('helpall.no_commands', guildId), 'error')],
                components: interaction.message.components
            });
        }

        // Build Description
        // Mobile Friendly: **cmd**\n> desc
        let description = "";
        for (const cmd of sortedCommands) {
            let desc = await t(`${cmd.name}.description`, guildId);
            if (desc === `${cmd.name}.description`) desc = cmd.description || await t('common.no_description', guildId);
            
            description += `**\`${prefix}${cmd.name}\`**\n> ${desc}\n\n`;
        }

        // Split into fields if too long (Discord limit 4096 chars for desc)
        // But for "pleasant to read", paginating or keeping it simple is best.
        // If > 4096, we might need to truncate. Assuming 20-30 cmds max per level, it should fit.
        // 30 cmds * (15 chars name + 50 chars desc + overhead) ~= 2000 chars. Safe.

        const embed = createEmbed(
            await t('helpall.level_title', guildId, { level: targetLevel }),
            description,
            'default'
        );

        await interaction.update({
            embeds: [embed],
            components: interaction.message.components
        });
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
        
        // Permission Check
        const isOwner = await isBotOwner(interaction.user.id);
        const userLevel = getUserLevel(interaction.member, config, isOwner);

        // Dynamic command list generation & filtering
        const commands = client.commands.filter(c => {
            const cmdCat = c.category ? c.category.toLowerCase() : '';
            if (cmdCat !== category.toLowerCase()) return false;
            
            // Check permission
            const requiredLevel = getCommandLevel(c);
            return userLevel >= requiredLevel;
        });
        
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
