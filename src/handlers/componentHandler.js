const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionsBitField
} = require('discord.js');
const { db } = require('../database');
const logger = require('../utils/logger');
const { updateV2Interaction, replyV2Interaction, extractActionRows } = require('../utils/componentUtils');
const { loadBackup } = require('../utils/backupHandler');
const { handleEmbedInteraction } = require('../commands/utils/embed');
const Backup = require('../database/models/Backup');
const Suggestion = require('../database/models/Suggestion');
const { createTicket } = require('../utils/modmailUtils');

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
        } else if (customId.startsWith('suggestion_')) {
            await handleSuggestionButton(client, interaction);
        } else if (customId.startsWith('modmail_')) {
            await handleModmailInteraction(client, interaction);
        } else if (customId === 'btn_set_profil') {
            await handleSetProfilButton(client, interaction);
        }
    // --- RESET HANDLERS ---
    if (customId === 'confirm_reset_server') {
        if (interaction.user.id !== interaction.guild.ownerId) {
             const { isBotOwner } = require('../utils/ownerUtils');
             if (!(await isBotOwner(interaction.user.id))) {
                 return interaction.reply({ content: "❌ Seul le propriétaire peut confirmer.", ephemeral: true });
             }
        }
        
        const { db } = require('../database');
        try {
            db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM whitelists WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM blacklists WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM forms WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM backups WHERE guild_id = ?').run(interaction.guild.id);
            
            await interaction.update({ content: "✅ Serveur réinitialisé avec succès.", components: [] });
        } catch (e) {
            await interaction.update({ content: `❌ Erreur: ${e.message}`, components: [] });
        }
    }

    if (customId === 'confirm_reset_all') {
        const { isBotOwner } = require('../utils/ownerUtils');
        if (!(await isBotOwner(interaction.user.id))) return interaction.reply({ content: "❌ Owner Only.", ephemeral: true });

        const { db } = require('../database');
        try {
            db.prepare('DELETE FROM guild_settings').run();
            db.prepare('DELETE FROM whitelists').run();
            db.prepare('DELETE FROM blacklists').run();
            db.prepare('DELETE FROM forms').run();
            db.prepare('DELETE FROM command_permissions').run();
            db.prepare('DELETE FROM backups').run();
            db.prepare('DELETE FROM active_tickets').run();
            
            await interaction.update({ content: "✅ **TOUTES** les données ont été effacées.", components: [] });
        } catch (e) {
            await interaction.update({ content: `❌ Erreur: ${e.message}`, components: [] });
        }
    }
    
    if (customId === 'cancel_reset') {
        await interaction.update({ content: "❌ Opération annulée.", components: [] });
    }

    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        
        if (interaction.customId === 'modal_set_profil') {
            await handleSetProfilModal(client, interaction);
        }
    });
};



async function handleSetProfilButton(client, interaction) {
    // Permission check: Administrator
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Vous devez être administrateur.", ephemeral: true });
    }

    const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId('modal_set_profil')
        .setTitle('Modifier le profil du bot');

    const nameInput = new TextInputBuilder()
        .setCustomId('profil_name')
        .setLabel("Nouveau Pseudo")
        .setPlaceholder("Laisser vide pour ne pas changer")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const picInput = new TextInputBuilder()
        .setCustomId('profil_pic')
        .setLabel("URL de l'Avatar")
        .setPlaceholder("https://... (Laisser vide pour ignorer)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const bannerInput = new TextInputBuilder()
        .setCustomId('profil_banner')
        .setLabel("URL de la Bannière")
        .setPlaceholder("https://... (Laisser vide pour ignorer)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(picInput),
        new ActionRowBuilder().addComponents(bannerInput)
    );

    await interaction.showModal(modal);
}

async function handleSetProfilModal(client, interaction) {
    const name = interaction.fields.getTextInputValue('profil_name');
    const pic = interaction.fields.getTextInputValue('profil_pic');
    const banner = interaction.fields.getTextInputValue('profil_banner');
    
    await interaction.deferReply({ ephemeral: true });
    
    let logs = [];
    const { Routes } = require('discord.js');
    const axios = require('axios');
    
    // Helper
    const getBase64FromUrl = async (url) => {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const mime = response.headers['content-type'];
        return `data:${mime};base64,${buffer.toString('base64')}`;
    };

    if (name) {
        try {
            await interaction.guild.members.me.setNickname(name);
            logs.push("✅ Pseudo modifié.");
        } catch (e) {
            logs.push(`❌ Erreur Pseudo: ${e.message}`);
        }
    }

    if (pic) {
        try {
            const dataUri = await getBase64FromUrl(pic);
            await client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
                body: { avatar: dataUri }
            });
            logs.push("✅ Avatar modifié.");
        } catch (e) {
            logs.push(`❌ Erreur Avatar: ${e.message}`);
        }
    }

    if (banner) {
        try {
            const dataUri = await getBase64FromUrl(banner);
            await client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
                body: { banner: dataUri }
            });
            logs.push("✅ Bannière modifiée.");
        } catch (e) {
            logs.push(`❌ Erreur Bannière: ${e.message}`);
        }
    }

    if (logs.length === 0) logs.push("ℹ️ Aucune modification demandée.");
    
    await interaction.editReply({ content: logs.join('\n') });
}

async function handleModmailInteraction(client, interaction) {
    if (interaction.customId === 'modmail_select_guild') {
        const guildId = interaction.values[0];
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return interaction.reply({ content: "❌ Serveur inaccessible.", ephemeral: true });
        }

        try {
            await interaction.deferUpdate(); // Acknowledge
            await createTicket(client, interaction.user, guild, "Ticket créé via sélection.");
            await interaction.editReply({ content: `✅ **Ticket ouvert sur ${guild.name} !**\nUn membre du staff vous répondra bientôt.`, components: [] });
        } catch (e) {
            await interaction.followUp({ content: `❌ Erreur: ${e.message}`, ephemeral: true });
        }
    } else if (interaction.customId === 'modmail_close') {
        // Permission check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Vous n'avez pas la permission de fermer ce ticket.", ephemeral: true });
        }

        const userId = interaction.channel.topic;
        if (!userId) {
            return interaction.reply({ content: "❌ Impossible d'identifier l'utilisateur de ce ticket (Topic vide).", ephemeral: true });
        }

        await interaction.reply({ content: "🔒 Fermeture du ticket en cours..." });

        // Notify user
        try {
            const user = await client.users.fetch(userId);
            await user.send(`🔒 **Votre ticket sur ${interaction.guild.name} a été fermé par le staff.**`);
        } catch (e) {
            // Ignore if DM closed
        }

        // Clean DB
        db.prepare('DELETE FROM active_tickets WHERE channel_id = ?').run(interaction.channel.id);

        // Delete channel after 3 seconds
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 3000);
    }
}

async function handleSuggestionButton(client, interaction) {
    const { customId, user } = interaction;
    const parts = customId.split('_'); // suggestion, up/down, ID
    const action = parts[1];
    const suggestionId = parts[2];

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion) {
        return interaction.reply({ content: "❌ Cette suggestion n'existe plus.", ephemeral: true });
    }

    const existingVote = suggestion.voters.find(v => v.userId === user.id);

    if (existingVote) {
        if (existingVote.vote === action) {
            // Remove vote
            suggestion.voters = suggestion.voters.filter(v => v.userId !== user.id);
            if (action === 'up') suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
            else suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
        } else {
            // Switch vote
            existingVote.vote = action;
            if (action === 'up') {
                suggestion.upvotes++;
                suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
            } else {
                suggestion.downvotes++;
                suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
            }
        }
    } else {
        // New vote
        suggestion.voters.push({ userId: user.id, vote: action });
        if (action === 'up') suggestion.upvotes++;
        else suggestion.downvotes++;
    }

    await suggestion.save();

    // Update buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`suggestion_up_${suggestionId}`)
                .setLabel(`👍 ${suggestion.upvotes}`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`suggestion_down_${suggestionId}`)
                .setLabel(`👎 ${suggestion.downvotes}`)
                .setStyle(ButtonStyle.Danger)
        );

    // We reuse the current message content
    const msgContent = `**📢 Nouvelle Suggestion**\nProposée par <@${suggestion.authorId}>\n\n> ${suggestion.content}`;
    await updateV2Interaction(client, interaction, msgContent, [row]);
}

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

    const isSelect = interaction.isStringSelectMenu() && customId === 'help_select_category';
    const isButton = interaction.isButton() && customId.startsWith('help_btn_');

    if (isSelect || isButton) {
        const value = isSelect ? interaction.values[0] : customId.replace('help_btn_', 'help_');
        let content = '';

        if (value === 'help_antiraid') {
            content = `**🛡️ SÉCURITÉ & ANTIRAID**
            
\`+secur\` : Ouvre le panneau de sécurité principal (Anti-Bot, Anti-Webook, etc.).
\`+raidlog <on/off> [salon]\` : Active/Désactive les logs de sécurité.
\`+raidping <rôle>\` : Définit le rôle à mentionner en cas d'alerte.
\`+unbanall\` : Débannir tous les utilisateurs bannis du serveur.`;
        } else if (value === 'help_config') {
            content = `**⚙️ CONFIGURATION**

\`+set profil\` : **Menu Interactif** pour changer Nom, Avatar et Bannière.
\`+set name <pseudo>\` : Changer le pseudo du bot sur ce serveur.
\`+set pic <url>\` : Changer l'avatar du bot sur ce serveur.
\`+set banner <url>\` : Changer la bannière de profil du bot sur ce serveur.
\`+set vocal <on/off/ID>\` : Connecter le bot en vocal 24/7.
\`+set lang <fr/en>\` : Changer la langue du bot.
\`+playto / watch / listen / stream <texte>\` : Change l'activité.
\`+online / idle / dnd / invisible\` : Change le statut du bot.
\`+theme <couleur>\` : Changer la couleur des embeds (#HEX).
\`+creation <temps>\` : Limite l'âge du compte pour rejoindre (ex: 7d).
\`+blrank <on/off>\` : Active/Désactive le blacklist rank (auto-ban des blacklistés).
\`+punition <kick/ban>\` : Définit la sanction par défaut.
\`+wl <add/del/list> <user>\` : Gérer la whitelist.
\`+change <cmd> <perm>\` : Changer les permissions des commandes.`;
        } else if (value === 'help_utils') {
            content = `**🔧 UTILITAIRES & RÔLES**

\`+suggestion\` : Poster une suggestion.
\`+suggestion <accept/refuse/delete> <ID>\` : Gérer une suggestion.
\`+lb suggestions\` : Classement des suggestions.
\`+embed\` : Créer un embed personnalisé.
\`+say <message>\` : Fait parler le bot.
\`+vocinfo\` : Affiche les stats vocales.`;
        } else if (value === 'help_admin') {
            content = `**💾 ADMINISTRATION & BACKUPS**

\`+backup create <nom>\` : Créer une backup.
\`+backup load <nom>\` : Charger une backup.
\`+backup list\` : Lister les backups.
\`+sync\` : Synchroniser les permissions des salons.
\`+renew <salon>\` : Recréer un salon à neuf.
\`+modmail <on/off/close>\` : Activer/Désactiver le modmail ou fermer un ticket.
\`+lang custom <on/off>\` : Gérer la langue personnalisée.`;
        } else if (value === 'help_owner') {
            content = `**👑 ESPACE OWNER**

\`+owner <add/del/list>\` : Gérer les owners du bot.
\`+bl <add/del/list> <user>\` : Gérer la blacklist globale.
\`+clear <owners/bl>\` : Vider entièrement une liste (Root Only).
\`+globalset <name/pic> <valeur>\` : Changer le profil **GLOBAL**.
\`+secur invite <on/off>\` : Activer l'anti-add (leave si ajouté par non-owner).
\`+server list\` : Liste des serveurs.
\`+server invite/leave <ID>\` : Rejoindre/Quitter un serveur.
\`+mp <ID> <msg>\` : Envoyer un MP.
\`+discussion <ID>\` : Ouvrir un chat avec un utilisateur.
\`+reset server\` : Réinitialiser la configuration de **CE** serveur.
\`+resetall\` : Réinitialiser **TOUS** les serveurs (Emergency).`;
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
