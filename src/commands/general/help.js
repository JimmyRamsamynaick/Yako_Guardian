const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { getUserLevel, getCommandLevel } = require('../../utils/permissionUtils');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'help',
    description: 'Affiche la liste des commandes ou les détails d\'une commande',
    category: 'General',
    usage: 'help [commande]',
    aliases: ['aide', 'h'],
    run: async (client, message, args) => {
        // Get help type configuration
        const config = await getGuildConfig(message.guild.id);
        
        const prefix = config.prefix || client.config.prefix;

        // Permission Check
        const isOwner = await isBotOwner(message.author.id);
        const userLevel = getUserLevel(message.member, config, isOwner);

        const components = [];

        // 1. Get Unique Categories
        const categories = new Set();
        client.commands.forEach(cmd => {
            if (cmd.category) {
                categories.add(cmd.category);
            }
        });

        const sortedCategories = Array.from(categories).sort();

        // 2. Build Options
        const options = [];
        
        const EMOJIS = {
            'Administration': '⚖️',
            'Antiraid': '⚔️',
            'Automation': '🤖',
            'Community': '👥',
            'Configuration': '⚙️',
            'Custom': '🎨',
            'General': '📌',
            'Giveaway': '🎉',
            'Moderation': '🔨',
            'Modmail': '📨',
            'Notifications': '🔔',
            'Owner': '👑',
            'Roles': '🎭',
            'Suggestion': '💡',
            'Tickets': '🎫',
            'Utils': '🛠️',
            'Voice': '🔊'
        };

        for (const cat of sortedCategories) {
            // Check if user has access to at least one command in this category
            const hasAccess = client.commands.some(cmd => {
                if (!cmd.category) return false;
                if (cmd.category !== cat) return false;
                return userLevel >= getCommandLevel(cmd);
            });

            if (hasAccess) {
                const catKey = cat.toLowerCase();
                // Try to find translation, fallback to name
                // Note: t() returns the key if translation is missing usually, or we can check
                let label = await t(`help.cat_${catKey}`, message.guild.id);
                // Simple check if translation failed (if t returns key) - implementation specific
                // Assuming t returns string. If it looks like a key, maybe fallback?
                // But we verified fr.json has keys.
                
                let description = await t(`help.cat_${catKey}_desc`, message.guild.id);

                options.push({
                    label: label,
                    value: `help_${catKey}`,
                    description: description.substring(0, 100), // Limit description length
                    emoji: EMOJIS[cat] || '📂'
                });
            }
        }

        if (options.length === 0) {
            options.push({ label: 'No commands available', value: 'help_none', description: 'You do not have access to any commands.' });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder(await t('help.placeholder', message.guild.id))
            .addOptions(options);

        // Add Select Menu to components
        components.push(new ActionRowBuilder().addComponents(selectMenu));

        // Close Button (Always present)
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_close').setLabel(await t('common.close', message.guild.id)).setStyle(ButtonStyle.Danger).setEmoji('✖️')
        ));

        const title = await t('help.title', message.guild.id);
        const welcome = await t('help.welcome', message.guild.id);
        const prefixText = await t('help.prefix', message.guild.id, { prefix: prefix });

        const embed = createEmbed(
            title, 
            `${welcome}\n\n${THEME.separators.line}\n${prefixText}`, 
            'default',
            { footer: client.user.username }
        );

        if (client.user.displayAvatarURL()) {
            embed.setThumbnail(client.user.displayAvatarURL());
        }

        try {
            await message.channel.send({ embeds: [embed], components: components });
        } catch (error) {
            console.error("Error sending help:", error);
            await message.channel.send("❌ " + await t('common.error_generic', message.guild.id));
        }
    }
};
