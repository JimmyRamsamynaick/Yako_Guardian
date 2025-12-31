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
const { updateV2Interaction, replyV2Interaction, extractActionRows } = require('../utils/componentUtils');
const { loadBackup } = require('../utils/backupHandler');
const { handleEmbedInteraction } = require('../commands/utils/embed');
const Backup = require('../database/models/Backup');

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
        } else if (customId.startsWith('backup_')) {
            await handleBackup(client, interaction);
        } else if (customId.startsWith('embed_') || customId.startsWith('modal_embed_')) {
            await handleEmbedInteraction(client, interaction);
        } else if (customId.startsWith('btn_role_')) {
            await handleRoleButton(client, interaction);
        }
    });
};

async function handleRoleButton(client, interaction) {
    const { customId } = interaction;
    const roleId = customId.replace('btn_role_', '');
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
        return interaction.reply({ content: "❌ Ce rôle n'existe plus.", ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "❌ Je ne peux pas gérer ce rôle (il est au-dessus de moi).", ephemeral: true });
    }

    const member = interaction.member;

    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            return interaction.reply({ content: `❌ Rôle **${role.name}** retiré.`, ephemeral: true });
        } else {
            await member.roles.add(role);
            return interaction.reply({ content: `✅ Rôle **${role.name}** ajouté.`, ephemeral: true });
        }
    } catch (e) {
        console.error(e);
        return interaction.reply({ content: "❌ Erreur lors de la modification du rôle.", ephemeral: true });
    }
}

async function handleBackup(client, interaction) {
    if (interaction.customId === 'backup_cancel') {
        await interaction.message.delete().catch(() => {});
        return;
    }

    const loadMatch = interaction.customId.match(/^backup_confirm_load_(.+)$/);
    if (loadMatch) {
        const name = loadMatch[1];
        
        // Check perms
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== interaction.guild.ownerId) {
             return replyV2Interaction(client, interaction, "❌ Permission refusée.", [], true);
        }

        try {
            await replyV2Interaction(client, interaction, "⏳ Chargement de la backup en cours... Patientez.", [], true);
            await loadBackup(interaction.guild, name);
            await replyV2Interaction(client, interaction, `✅ Backup \`${name}\` chargée avec succès !`, [], true);
            await interaction.message.delete().catch(() => {});
        } catch (error) {
            console.error(error);
            await replyV2Interaction(client, interaction, `❌ Erreur lors du chargement : ${error.message}`, [], true);
        }
        return;
    }

    const delMatch = interaction.customId.match(/^backup_confirm_delete_(.+)$/);
    if (delMatch) {
        const name = delMatch[1];
        
        // Check perms
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== interaction.guild.ownerId) {
             return replyV2Interaction(client, interaction, "❌ Permission refusée.", [], true);
        }

        try {
            await Backup.deleteOne({ guild_id: interaction.guild.id, name: name });
            await replyV2Interaction(client, interaction, `✅ Backup \`${name}\` supprimée avec succès.`, [], true);
            await interaction.message.delete().catch(() => {});
        } catch (error) {
            console.error(error);
            await replyV2Interaction(client, interaction, `❌ Erreur : ${error.message}`, [], true);
        }
        return;
    }
}

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
            
\`+secur\` : Ouvre le panneau de sécurité principal (Anti-Bot, Anti-Webook, etc.).
\`+raidlog <on/off> [salon]\` : Active/Désactive les logs de sécurité.
\`+raidping <rôle>\` : Définit le rôle à mentionner en cas d'alerte.
\`+unbanall\` : Débannir tous les utilisateurs bannis du serveur.`;
        } else if (value === 'help_config') {
            content = `**⚙️ CONFIGURATION**

\`+antitoken <on/off/lock>\` : Protection anti-token.
\`+antitoken <nombre>/<durée>\` : Limite de join (ex: 5/10s).
\`+creation limit <durée>\` : Limite d'âge de compte minimum.
\`+punition <antiraid/all> <kick/ban/derank>\` : Type de sanction automatique.
\`+blrank <on/off/max>\` : Active le Blacklist Rank (ban auto des blacklistés).
\`+autoreact <add/remove/list>\` : Gestion des réactions automatiques.
\`+button\` : Créateur de boutons personnalisés (rôles, messages).`;
        } else if (value === 'help_utils') {
            content = `**🔧 UTILITAIRES & RÔLES**
            
\`+embed\` : Créateur d'embed avancé (Titre, Image, Footer...).
\`+massiverole <add/remove> <rôle>\` : Ajoute/Retire un rôle à tout le serveur.
\`+temprole <@user> <rôle> <temps>\` : Donne un rôle temporairement.
\`+voicekick <@user>\` : Déconnecte un utilisateur du vocal.
\`+voicemove <@user> <salon>\` : Déplace un utilisateur vers un autre salon.
\`+bringall <salon>\` : Déplace tous les membres vocaux vers un salon (ID requis).
\`+cleanup\` : Supprime les salons vocaux vides (si configuré).
\`+changelogs\` : Notes de mise à jour.
\`+serverinfo\`, \`+vocinfo\`, \`+user\`, \`+role\`, \`+channel\` : Infos détaillées.
\`+pic\`, \`+banner\`, \`+server pic/banner\`, \`+emoji\` : Récupération d'images.
\`+snipe\` : Affiche le dernier message supprimé.
\`+allbots\`, \`+alladmins\`, \`+botadmins\`, \`+boosters\`, \`+rolemembers\` : Listes.
\`+image\`, \`+wiki\`, \`+calc\` : Outils de recherche et calcul.
\`+suggestion\`, \`+lb suggestions\` : Système de suggestions.
\`+yako\` : Serveur de support.`;
        } else if (value === 'help_admin') {
            content = `**💾 ADMINISTRATION & BACKUPS**

\`+wl <@membre/ID>\` : Ajoute un membre à la whitelist (Permission max).
\`+unwl <@membre/ID>\` : Retire un membre de la whitelist.
\`+wl list\` : Affiche la liste des membres whitelistés.
\`+blrank <add/del> <membre>\` : Ajoute/Retire manuellement de la blacklist.
\`+backup create <nom>\` : Crée une sauvegarde du serveur.
\`+backup load <nom>\` : Charge une sauvegarde (Attention: écrase tout).
\`+autobackup <on/off>\` : Active les sauvegardes automatiques.
\`+sync\` : Synchronise les permissions des salons avec les catégories.
\`+renew\` : Recrée le salon actuel.
\`+formulaire\` : Configure le système de Modmail.`;
        }

        const components = extractActionRows(interaction.message.components);
        
        try {
            await updateV2Interaction(
                client, 
                interaction, 
                content + '\n\n_Sélectionnez une autre catégorie ci-dessous pour changer._', 
                components
            );
        } catch (error) {
            console.error("Error updating V2 help:", error);
        }
    }
}

async function handleSecurPanel(client, interaction) {
    const guildId = interaction.guild.id;
    let settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    if (!settings) {
        try {
            await replyV2Interaction(client, interaction, "❌ Erreur : Paramètres introuvables. Veuillez refaire +secur.", [], true);
        } catch (e) { console.error("Error replying no settings:", e); }
        return;
    }
    
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
                    .setCustomId('secur_toggle_all_max')
                    .setLabel('Tout Max')
                    .setStyle(ButtonStyle.Primary),
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

        try {
            await updateV2Interaction(
                client,
                interaction,
                `**Configuration : ${module.toUpperCase()}**\nÉtat actuel : ${settings[module]}\n\nChoisissez une action :`,
                [rowModuleActions, rowBack]
            );
        } catch (error) {
            console.error("Error updating V2 secur panel (module select):", error);
        }
        return;
    }

    // --- Handling Module Actions ---
    
    if (interaction.isButton()) {
        if (interaction.customId === 'secur_back_main' || interaction.customId === 'secur_refresh') {
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            try {
                await updateV2Interaction(
                    client,
                    interaction,
                    generateStatusText(settings),
                    [getRowSelect(), getRowButtons()]
                );
            } catch (error) {
                console.error("Error updating V2 secur panel (back/refresh):", error);
            }
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
            try {
                await updateV2Interaction(
                    client,
                    interaction,
                    generateStatusText(settings),
                    [getRowSelect(), getRowButtons()]
                );
            } catch (error) {
                console.error("Error updating V2 secur panel (all on):", error);
            }
            return;
        }

        if (interaction.customId === 'secur_toggle_all_max') {
            // Update all to MAX
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='max', antiupdate='max', antichannel='max', antirole='max', 
                antiwebhook='max', antiunban='max', antibot='max', antiban='max', 
                antieveryone='max', antideco='max' 
                WHERE guild_id = ?`).run(guildId);
            
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            try {
                await updateV2Interaction(
                    client,
                    interaction,
                    generateStatusText(settings),
                    [getRowSelect(), getRowButtons()]
                );
            } catch (error) {
                console.error("Error updating V2 secur panel (all max):", error);
            }
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
            try {
                await updateV2Interaction(
                    client,
                    interaction,
                    generateStatusText(settings),
                    [getRowSelect(), getRowButtons()]
                );
            } catch (error) {
                console.error("Error updating V2 secur panel (all off):", error);
            }
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

                try {
                    await updateV2Interaction(
                        client,
                        interaction,
                        `**Configuration : ${moduleName.toUpperCase()}**\nÉtat actuel : ${settings[moduleName]}\n\nChoisissez une action :`,
                        [rowModuleActions, rowBack]
                    );
                } catch (error) {
                    console.error("Error updating V2 secur panel (action):", error);
                }
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
                try {
                    await replyV2Interaction(client, interaction, `✅ Configuration sauvegardée pour ${moduleName} : ${limitCount} actions en ${limitTime}ms.`, [], true);
                } catch (error) {
                    console.error("Error replying V2 modal:", error);
                }
            } else {
                try {
                    await replyV2Interaction(client, interaction, `⚠️ Configuration ignorée (champs vides).`, [], true);
                } catch (error) {
                    console.error("Error replying V2 modal (empty):", error);
                }
            }
        }
    }
}
