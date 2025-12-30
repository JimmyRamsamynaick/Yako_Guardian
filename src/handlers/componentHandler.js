// src/handlers/componentHandler.js
const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { db } = require('../database');
const logger = require('../utils/logger');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

        // Basic permission check (Owner/Whitelist only - to be refined)
        // For now, allow anyone with Administrator or Owner for testing
        // const isAllowed = interaction.member.permissions.has('Administrator');
        // if (!isAllowed) return interaction.reply({ content: '❌ Vous n\'avez pas la permission.', ephemeral: true });

        const { customId } = interaction;

        if (customId.startsWith('secur_')) {
            await handleSecurPanel(client, interaction);
        } else if (customId.startsWith('help_')) {
            await handleHelpMenu(client, interaction);
        }
    });
};

async function handleHelpMenu(client, interaction) {
    const { customId } = interaction;

    if (customId === 'help_close') {
        await interaction.message.delete();
        return;
    }

    if (interaction.isStringSelectMenu() && customId === 'help_select_category') {
        const value = interaction.values[0];
        let content = '';

        if (value === 'help_antiraid') {
            content = `**🛡️ SÉCURITÉ & ANTIRAID**
            
\`+secur\` : Ouvre le panneau de sécurité principal.
\`+raidlog <on/off> [salon]\` : Active/Désactive les logs antiraid.
\`+raidping <rôle>\` : Définit le rôle à mentionner en cas de raid.

_Les modules antiraid se configurent via le panneau \`+secur\`._`;
        } else if (value === 'help_config') {
            content = `**⚙️ CONFIGURATION**

\`+antitoken <on/off/lock>\` : Protection anti-token.
\`+antitoken <nombre>/<durée>\` : Limite de join (ex: 5/10s).
\`+creation limit <durée>\` : Limite d'âge de compte.
\`+punition <antiraid/all> <kick/ban/derank>\` : Type de sanction.
\`+blrank <on/off/max>\` : Active le Blacklist Rank.`;
        } else if (value === 'help_whitelist') {
            content = `**👥 WHITELIST & GESTION**

\`+wl <@membre/ID>\` : Ajoute un membre à la whitelist.
\`+unwl <@membre/ID>\` : Retire un membre de la whitelist.
\`+wl\` : Affiche la liste des whitelisted.
\`+blrank <add/del> <membre>\` : Ajoute/Retire manuellement de la blacklist.`;
        }

        await interaction.update({
            content: content + '\n\n_Sélectionnez une autre catégorie ci-dessous pour changer._',
            components: interaction.message.components // Keep the existing menu
        });
    }
}

async function handleSecurPanel(client, interaction) {
    const guildId = interaction.guild.id;
    let settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    // Helper to regenerate the panel
    const generateStatusText = (s) => {
        return `**YAKO GUARDIAN - PANNEAU DE SÉCURITÉ**
            
**🛡️ Modules Antiraid**
\`Anti-Token\` : ${s.antitoken_level}
\`Anti-Update\` : ${s.antiupdate}
\`Anti-Channel\` : ${s.antichannel}
\`Anti-Role\` : ${s.antirole}
\`Anti-Webhook\` : ${s.antiwebhook}
\`Anti-Unban\` : ${s.antiunban}
\`Anti-Bot\` : ${s.antibot}
\`Anti-Ban\` : ${s.antiban}
\`Anti-Everyone\` : ${s.antieveryone}
\`Anti-Deco\` : ${s.antideco}

_Utilisez le menu ci-dessous pour configurer un module._`;
    };
    
    const getRowSelect = () => new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('secur_select_module')
                    .setPlaceholder('Choisir un module à configurer')
                    .addOptions([
                        { label: 'Anti-Token', value: 'antitoken_level', description: 'Protection contre les tokens/selfbots', emoji: '🚪' },
                        { label: 'Anti-Bot', value: 'antibot', description: 'Empêche l\'ajout de bots non vérifiés', emoji: '🤖' },
                        { label: 'Anti-Ban', value: 'antiban', description: 'Limite les bannissements massifs', emoji: '🔨' },
                        { label: 'Anti-Channel', value: 'antichannel', description: 'Protection des salons', emoji: '📺' },
                        { label: 'Anti-Role', value: 'antirole', description: 'Protection des rôles', emoji: '🎭' },
                        { label: 'Anti-Webhook', value: 'antiwebhook', description: 'Protection des webhooks', emoji: '🔗' },
                        { label: 'Anti-Everyone', value: 'antieveryone', description: 'Anti @everyone / @here', emoji: '📢' },
                        { label: 'Anti-Update', value: 'antiupdate', description: 'Anti modification serveur', emoji: '⚙️' },
                        { label: 'Anti-Deco', value: 'antideco', description: 'Anti déconnexion', emoji: '🔌' },
                    ])
            );

    const getRowButtons = () => new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_on')
                    .setLabel('Tout Activer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('secur_toggle_all_off')
                    .setLabel('Tout Désactiver')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('secur_refresh')
                    .setLabel('Rafraîchir')
                    .setStyle(ButtonStyle.Secondary)
            );

    // --- Handling Selections ---

    if (interaction.isStringSelectMenu() && interaction.customId === 'secur_select_module') {
        const module = interaction.values[0];
        
        // Show options for the selected module
        // We can use a new row of buttons: OFF / ON / MAX / CONFIG
        
        const rowModuleActions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_off`)
                    .setLabel('OFF')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_on`)
                    .setLabel('ON')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_max`)
                    .setLabel('MAX')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_config`)
                    .setLabel('CONFIG')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const rowBack = new ActionRowBuilder()
            .addComponents(
                 new ButtonBuilder()
                    .setCustomId('secur_back_main')
                    .setLabel('Retour')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            content: `**Configuration : ${module.toUpperCase()}**\nÉtat actuel : ${settings[module]}\n\nChoisissez une action :`,
            components: [rowModuleActions, rowBack]
        });
        return;
    }

    // --- Handling Module Actions ---
    
    if (interaction.isButton()) {
        if (interaction.customId === 'secur_back_main' || interaction.customId === 'secur_refresh') {
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            await interaction.update({
                content: generateStatusText(settings),
                components: [getRowSelect(), getRowButtons()]
            });
            return;
        }

        if (interaction.customId === 'secur_toggle_all_on') {
            // Update all to ON
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='on', antiupdate='on', antichannel='on', antirole='on', 
                antiwebhook='on', antiunban='on', antibot='on', antiban='on', 
                antieveryone='on', antideco='on' 
                WHERE guild_id = ?`).run(guildId);
            
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            await interaction.update({
                content: generateStatusText(settings),
                components: [getRowSelect(), getRowButtons()]
            });
            return;
        }

        if (interaction.customId === 'secur_toggle_all_off') {
            // Update all to OFF
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='off', antiupdate='off', antichannel='off', antirole='off', 
                antiwebhook='off', antiunban='off', antibot='off', antiban='off', 
                antieveryone='off', antideco='off' 
                WHERE guild_id = ?`).run(guildId);
            
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            await interaction.update({
                content: generateStatusText(settings),
                components: [getRowSelect(), getRowButtons()]
            });
            return;
        }

        // Regex to catch secur_mod_<module>_<action>
        const match = interaction.customId.match(/^secur_mod_(.+?)_(off|on|max|config)$/);
        if (match) {
            const moduleName = match[1];
            const action = match[2];

            if (action === 'config') {
                // Show modal for limits configuration
                const modal = new ModalBuilder()
                    .setCustomId(`secur_modal_${moduleName}`)
                    .setTitle(`Configuration ${moduleName}`);

                const limitInput = new TextInputBuilder()
                    .setCustomId('limit_count')
                    .setLabel("Nombre limite (ex: 3)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const timeInput = new TextInputBuilder()
                    .setCustomId('limit_time')
                    .setLabel("Temps en ms (ex: 10000 pour 10s)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                // Fetch existing limit to pre-fill? (Optional, requires extra DB query logic)
                // For now, let's keep it empty or simple.
                
                const firstActionRow = new ActionRowBuilder().addComponents(limitInput);
                const secondActionRow = new ActionRowBuilder().addComponents(timeInput);

                modal.addComponents(firstActionRow, secondActionRow);

                await interaction.showModal(modal);
                return;
            } else {
                // Update State (off, on, max)
                db.prepare(`UPDATE guild_settings SET ${moduleName} = ? WHERE guild_id = ?`).run(action, guildId);
                
                settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
                
                // Re-render the module view
                const rowModuleActions = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_off`).setLabel('OFF').setStyle(action === 'off' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_on`).setLabel('ON').setStyle(action === 'on' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_max`).setLabel('MAX').setStyle(action === 'max' ? ButtonStyle.Danger : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_config`).setLabel('CONFIG').setStyle(ButtonStyle.Secondary)
                );
                const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('secur_back_main').setLabel('Retour').setStyle(ButtonStyle.Secondary));

                await interaction.update({
                    content: `**Configuration : ${moduleName.toUpperCase()}**\nÉtat actuel : ${settings[moduleName]}\n\nChoisissez une action :`,
                    components: [rowModuleActions, rowBack]
                });
            }
        }
    }

    // --- Handling Modals ---
    if (interaction.isModalSubmit()) {
        const match = interaction.customId.match(/^secur_modal_(.+?)$/);
        if (match) {
            const moduleName = match[1];
            const limitCount = interaction.fields.getTextInputValue('limit_count');
            const limitTime = interaction.fields.getTextInputValue('limit_time');

            // Save to DB
            if (limitCount && limitTime) {
                db.prepare(`INSERT OR REPLACE INTO module_limits (guild_id, module, limit_count, limit_time) VALUES (?, ?, ?, ?)`).run(guildId, moduleName, parseInt(limitCount), parseInt(limitTime));
                await interaction.reply({ content: `✅ Configuration sauvegardée pour ${moduleName} : ${limitCount} actions en ${limitTime}ms.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `⚠️ Configuration ignorée (champs vides).`, ephemeral: true });
            }
        }
    }
}
