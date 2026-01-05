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
    aliases: ['aide', 'h'],
    run: async (client, message, args) => {
        // Get help type configuration
        const config = await getGuildConfig(message.guild.id);
        
        // Read help_type from SQLite (Source of Truth)
        const settings = db.prepare('SELECT help_type FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        const helpType = settings?.help_type || 'select'; // select, button, hybrid
        
        const prefix = config.prefix || client.config.prefix;

        // Permission Check
        const isOwner = await isBotOwner(message.author.id);
        const userLevel = getUserLevel(message.member, config, isOwner);

        const components = [];

        // 1. SELECT MENU
        const rawOptions = [
            { label: await t('help.cat_administration', message.guild.id), value: 'help_administration', description: await t('help.cat_administration_desc', message.guild.id), emoji: THEME.icons.settings },
            { label: await t('help.cat_antiraid', message.guild.id), value: 'help_antiraid', description: await t('help.cat_antiraid_desc', message.guild.id), emoji: THEME.icons.security },
            { label: await t('help.cat_auto', message.guild.id), value: 'help_auto', description: await t('help.cat_auto_desc', message.guild.id), emoji: '🤖' },
            { label: await t('help.cat_community', message.guild.id), value: 'help_community', description: await t('help.cat_community_desc', message.guild.id), emoji: THEME.icons.community },
            { label: await t('help.cat_configuration', message.guild.id), value: 'help_configuration', description: await t('help.cat_configuration_desc', message.guild.id), emoji: '⚙️' },
            { label: await t('help.cat_custom', message.guild.id), value: 'help_custom', description: await t('help.cat_custom_desc', message.guild.id), emoji: '🎨' },
            { label: await t('help.cat_general', message.guild.id), value: 'help_general', description: await t('help.cat_general_desc', message.guild.id), emoji: THEME.icons.info },
            { label: await t('help.cat_giveaway', message.guild.id), value: 'help_giveaway', description: await t('help.cat_giveaway_desc', message.guild.id), emoji: '🎉' },
            { label: await t('help.cat_moderation', message.guild.id), value: 'help_moderation', description: await t('help.cat_moderation_desc', message.guild.id), emoji: THEME.icons.mod },
            { label: await t('help.cat_modmail', message.guild.id), value: 'help_modmail', description: await t('help.cat_modmail_desc', message.guild.id), emoji: '📨' },
            { label: await t('help.cat_notifications', message.guild.id), value: 'help_notifications', description: await t('help.cat_notifications_desc', message.guild.id), emoji: '🔔' },
            { label: await t('help.cat_owner', message.guild.id), value: 'help_owner', description: await t('help.cat_owner_desc', message.guild.id), emoji: '👑' },
            { label: await t('help.cat_roles', message.guild.id), value: 'help_roles', description: await t('help.cat_roles_desc', message.guild.id), emoji: '🎭' },
            { label: await t('help.cat_suggestion', message.guild.id), value: 'help_suggestion', description: await t('help.cat_suggestion_desc', message.guild.id), emoji: '💡' },
            { label: await t('help.cat_tickets', message.guild.id), value: 'help_tickets', description: await t('help.cat_tickets_desc', message.guild.id), emoji: THEME.icons.tickets },
            { label: await t('help.cat_utils', message.guild.id), value: 'help_utils', description: await t('help.cat_utils_desc', message.guild.id), emoji: THEME.icons.utils },
            { label: await t('help.cat_voice', message.guild.id), value: 'help_voice', description: await t('help.cat_voice_desc', message.guild.id), emoji: '🔊' }
        ];

        // Filter Options based on Permission
        const filteredOptions = rawOptions.filter(opt => {
            const category = opt.value.replace('help_', '');
            return client.commands.some(cmd => {
                const cmdCat = cmd.category ? cmd.category.toLowerCase() : '';
                if (cmdCat !== category) return false;
                return userLevel >= getCommandLevel(cmd);
            });
        });

        // Fallback if no options (shouldn't happen for Level 0, but good safety)
        if (filteredOptions.length === 0) {
            filteredOptions.push({ label: 'No commands available', value: 'help_none', description: 'You do not have access to any commands.' });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder(await t('help.placeholder', message.guild.id))
            .addOptions(filteredOptions);

        // 2. BUTTONS

        const btnAntiraid = new ButtonBuilder().setCustomId('help_btn_antiraid').setLabel(await t('help.btn_antiraid', message.guild.id)).setStyle(ButtonStyle.Secondary).setEmoji(THEME.icons.security);
        const btnConfig = new ButtonBuilder().setCustomId('help_btn_config').setLabel(await t('help.btn_config', message.guild.id)).setStyle(ButtonStyle.Secondary).setEmoji(THEME.icons.settings);
        const btnUtils = new ButtonBuilder().setCustomId('help_btn_utils').setLabel(await t('help.btn_utils', message.guild.id)).setStyle(ButtonStyle.Secondary).setEmoji(THEME.icons.utils);
        const btnAdmin = new ButtonBuilder().setCustomId('help_btn_admin').setLabel(await t('help.btn_admin', message.guild.id)).setStyle(ButtonStyle.Secondary).setEmoji('💾');
        const btnOwner = new ButtonBuilder().setCustomId('help_btn_owner').setLabel(await t('help.btn_owner', message.guild.id)).setStyle(ButtonStyle.Danger).setEmoji('👑');

        // Build Rows based on Type
        if (helpType === 'select') {
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        } 
        else if (helpType === 'button') {
            components.push(new ActionRowBuilder().addComponents(btnAntiraid, btnConfig, btnUtils, btnAdmin, btnOwner));
        } 
        else if (helpType === 'hybrid') {
            // Both Select AND Buttons (maybe buttons for quick access)
            components.push(new ActionRowBuilder().addComponents(selectMenu));
            components.push(new ActionRowBuilder().addComponents(btnAntiraid, btnConfig, btnUtils, btnAdmin, btnOwner));
        }

        // Close Button (Always present)
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_close').setLabel(await t('common.close', message.guild.id)).setStyle(ButtonStyle.Danger).setEmoji('✖️')
        ));

        const title = await t('help.title', message.guild.id);
        const welcome = await t('help.welcome', message.guild.id);
        const mode = await t('help.display_mode', message.guild.id, { mode: helpType.toUpperCase() });
        const prefixText = await t('help.prefix', message.guild.id, { prefix: prefix });

        const embed = createEmbed(
            title, 
            `${welcome}\n\n${THEME.separators.line}\n${mode}\n${prefixText}`, 
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
