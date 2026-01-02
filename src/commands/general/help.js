const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'help',
    aliases: ['aide', 'h'],
    run: async (client, message, args) => {
        // Get help type configuration
        const config = await getGuildConfig(message.guild.id);
        const helpType = config.helpType || 'select'; // select, button, hybrid

        const components = [];

        // 1. SELECT MENU
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder(await t('help.placeholder', message.guild.id))
            .addOptions([
                { label: await t('help.cat_administration', message.guild.id), value: 'help_administration', description: await t('help.cat_administration_desc', message.guild.id), emoji: '⚖️' },
                { label: await t('help.cat_antiraid', message.guild.id), value: 'help_antiraid', description: await t('help.cat_antiraid_desc', message.guild.id), emoji: '🛡️' },
                { label: await t('help.cat_auto', message.guild.id), value: 'help_auto', description: await t('help.cat_auto_desc', message.guild.id), emoji: '🤖' },
                { label: await t('help.cat_configuration', message.guild.id), value: 'help_configuration', description: await t('help.cat_configuration_desc', message.guild.id), emoji: '⚙️' },
                { label: await t('help.cat_custom', message.guild.id), value: 'help_custom', description: await t('help.cat_custom_desc', message.guild.id), emoji: '🎨' },
                { label: await t('help.cat_general', message.guild.id), value: 'help_general', description: await t('help.cat_general_desc', message.guild.id), emoji: '📌' },
                { label: await t('help.cat_moderation', message.guild.id), value: 'help_moderation', description: await t('help.cat_moderation_desc', message.guild.id), emoji: '🔨' },
                { label: await t('help.cat_modmail', message.guild.id), value: 'help_modmail', description: await t('help.cat_modmail_desc', message.guild.id), emoji: '📨' },
                { label: await t('help.cat_notifications', message.guild.id), value: 'help_notifications', description: await t('help.cat_notifications_desc', message.guild.id), emoji: '🔔' },
                { label: await t('help.cat_owner', message.guild.id), value: 'help_owner', description: await t('help.cat_owner_desc', message.guild.id), emoji: '👑' },
                { label: await t('help.cat_roles', message.guild.id), value: 'help_roles', description: await t('help.cat_roles_desc', message.guild.id), emoji: '🎭' },
                { label: await t('help.cat_suggestion', message.guild.id), value: 'help_suggestion', description: await t('help.cat_suggestion_desc', message.guild.id), emoji: '💡' },
                { label: await t('help.cat_tickets', message.guild.id), value: 'help_tickets', description: await t('help.cat_tickets_desc', message.guild.id), emoji: '🎫' },
                { label: await t('help.cat_utils', message.guild.id), value: 'help_utils', description: await t('help.cat_utils_desc', message.guild.id), emoji: '🛠️' },
                { label: await t('help.cat_voice', message.guild.id), value: 'help_voice', description: await t('help.cat_voice_desc', message.guild.id), emoji: '🔊' }
            ]);

        // 2. BUTTONS
        const btnAntiraid = new ButtonBuilder().setCustomId('help_btn_antiraid').setLabel(await t('help.btn_antiraid', message.guild.id)).setStyle(ButtonStyle.Primary).setEmoji('🛡️');
        const btnConfig = new ButtonBuilder().setCustomId('help_btn_config').setLabel(await t('help.btn_config', message.guild.id)).setStyle(ButtonStyle.Primary).setEmoji('⚙️');
        const btnUtils = new ButtonBuilder().setCustomId('help_btn_utils').setLabel(await t('help.btn_utils', message.guild.id)).setStyle(ButtonStyle.Primary).setEmoji('🔧');
        const btnAdmin = new ButtonBuilder().setCustomId('help_btn_admin').setLabel(await t('help.btn_admin', message.guild.id)).setStyle(ButtonStyle.Primary).setEmoji('💾');
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
            // Or Select for detailed, Buttons for categories?
            // Let's do: Select Menu + Buttons row
            components.push(new ActionRowBuilder().addComponents(selectMenu));
            components.push(new ActionRowBuilder().addComponents(btnAntiraid, btnConfig, btnUtils, btnAdmin, btnOwner));
        }

        // Close Button (Always present)
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_close').setLabel(await t('common.close', message.guild.id)).setStyle(ButtonStyle.Danger)
        ));

        const title = await t('help.title', message.guild.id);
        const welcome = await t('help.welcome', message.guild.id);
        const mode = await t('help.display_mode', message.guild.id, { mode: helpType.toUpperCase() });
        const prefixText = await t('help.prefix', message.guild.id, { prefix: config.prefix || client.config.prefix });

        const content = `${title}
            
${welcome}
${mode}

${prefixText}`;

        try {
            await sendV2Message(client, message.channel.id, content, components);
        } catch (error) {
            console.error("Error sending V2 help:", error);
            // Fallback if V2 fails (though sendV2Message should handle it)
            // Using sendV2Message with minimal content as error report
            await sendV2Message(client, message.channel.id, "❌ " + await t('common.error_generic', message.guild.id), []);
        }
    }
};
