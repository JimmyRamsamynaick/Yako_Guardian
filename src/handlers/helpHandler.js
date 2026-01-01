const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { updateV2Interaction, replyV2Interaction, extractActionRows } = require('../utils/componentUtils');
const { getGuildConfig } = require('../utils/mongoUtils');

async function handleHelpMenu(client, interaction) {
    const { customId } = interaction;

    if (customId === 'help_close') {
        try {
            await interaction.message.delete();
        } catch (e) {
            await updateV2Interaction(client, interaction, "❌ Menu fermé.", []);
        }
        return;
    }

    const isSelect = interaction.isStringSelectMenu() && customId === 'help_select_category';
    const isButton = interaction.isButton() && customId.startsWith('help_btn_');

    if (isSelect || isButton) {
        const value = isSelect ? interaction.values[0] : customId.replace('help_btn_', 'help_');
        
        const config = await getGuildConfig(interaction.guildId);
        const prefix = config.prefix || client.config.prefix;
        
        let content = '';

        if (value === 'help_antiraid') {
            content = `**🛡️ SÉCURITÉ & ANTIRAID**
            
\`${prefix}secur\` : Ouvre le panneau de sécurité principal (Anti-Bot, Anti-Webook, etc.).
\`${prefix}raidlog <on/off> [salon]\` : Active/Désactive les logs de sécurité.
\`${prefix}raidping <rôle>\` : Définit le rôle à mentionner en cas d'alerte.
\`${prefix}unbanall\` : Débannir tous les utilisateurs bannis du serveur.`;
        } else if (value === 'help_config') {
            content = `**⚙️ CONFIGURATION**

\`${prefix}prefix <préfixe>\` : Changer le préfixe du bot.
\`${prefix}perms\` : Voir les permissions configurées.
\`${prefix}set perm <perm/cmd> <rôle>\` : Configurer une permission.
\`${prefix}del perm <rôle>\` : Supprimer une permission.
\`${prefix}clear perms\` : Tout réinitialiser.

\`${prefix}custom <mot-clé> <réponse>\` : Créer une commande personnalisée.
\`${prefix}custom transfer <old> <new>\` : Renommer une commande custom.
\`${prefix}customlist\` / \`${prefix}clear customs\` : Lister ou vider les commandes.

\`${prefix}reminder [temps]\` : Créer un rappel.
\`${prefix}reminder list\` : Voir vos rappels.

\`${prefix}twitch\` : Configurer les alertes Twitch.
\`${prefix}join settings\` / \`${prefix}leave settings\` : Messages de bienvenue/départ.
\`${prefix}autopublish\` : Configurer l'auto-publish.
\`${prefix}show pics\` : Configurer l'envoi auto de photos de profil.

\`${prefix}set profil\` : Menu pour changer Nom/Avatar/Bannière.
\`${prefix}set vocal <on/off/ID>\` : Connecter le bot en vocal 24/7.
\`${prefix}set lang <fr/en>\` : Changer la langue.
\`${prefix}theme <couleur>\` : Changer la couleur des embeds.
\`${prefix}wl <add/del/list> <user>\` : Gérer la whitelist.`;
        } else if (value === 'help_utils') {
            content = `**🔧 UTILITAIRES & RÔLES**

\`${prefix}rolemenu [ID]\` : Créer/Modifier un menu de rôles interactif.
\`${prefix}soutien\` : Configurer le rôle de soutien (statut).
\`${prefix}restrict <émoji> <rôle>\` : Restreindre une réaction à un rôle.
\`${prefix}unrestrict <émoji>\` : Retirer la restriction.

\`${prefix}ticket settings\` : Configurer le système de tickets.
\`${prefix}claim\` / \`${prefix}close\` / \`${prefix}rename\` : Gérer un ticket.
\`${prefix}add <membre>\` / \`${prefix}del <membre>\` : Gérer les membres du ticket.

\`${prefix}tempvoc\` / \`${prefix}tempvoc cmd\` : Configurer les vocaux temporaires.

\`${prefix}suggestion\` : Poster une suggestion.
\`${prefix}suggestion settings\` : Configurer les suggestions.
\`${prefix}lb suggestions\` : Classement des suggestions.
\`${prefix}embed\` : Créer un embed personnalisé.
\`${prefix}say <message>\` : Fait parler le bot.
\`${prefix}vocinfo\` : Affiche les stats vocales.`;
        } else if (value === 'help_admin') {
            content = `**💾 ADMINISTRATION & BACKUPS**

\`${prefix}slowmode <durée> [salon]\` : Définir le slowmode (max 6h).
\`${prefix}autodelete <mode> <type> <valeur>\` : Suppr. auto des messages.
\`${prefix}modmail <on/off/close>\` : Activer/Désactiver le modmail ou fermer un ticket.
\`${prefix}report settings\` : Configurer le système de signalement.

\`${prefix}backup create <nom>\` : Créer une backup.
\`${prefix}backup load <nom>\` : Charger une backup.
\`${prefix}backup list\` : Lister les backups.
\`${prefix}sync\` : Synchroniser les permissions des salons.
\`${prefix}renew <salon>\` : Recréer un salon à neuf.
\`${prefix}lang custom <on/off>\` : Gérer la langue personnalisée.`;
        } else if (value === 'help_owner') {
             // Check permission? The menu button should probably be visible but restricted?
             // Or maybe just show it. The command execution will check perms.
             // But showing help is fine usually.
            content = `**👑 ESPACE OWNER**

\`${prefix}owner <add/del/list>\` : Gérer les owners du bot.
\`${prefix}bl <add/del/list> <user>\` : Gérer la blacklist globale.
\`${prefix}clear <owners/bl>\` : Vider entièrement une liste (Root Only).
\`${prefix}globalset <name/pic> <valeur>\` : Changer le profil **GLOBAL**.
\`${prefix}secur invite <on/off>\` : Activer l'anti-add (leave si ajouté par non-owner).
\`${prefix}server list\` : Liste des serveurs.
\`${prefix}server invite/leave <ID>\` : Rejoindre/Quitter un serveur.
\`${prefix}mp <ID> <msg>\` : Envoyer un MP.
\`${prefix}discussion <ID>\` : Ouvrir un chat avec un utilisateur.
\`${prefix}reset server\` : Réinitialiser la configuration de **CE** serveur.
\`${prefix}resetall\` : Réinitialiser **TOUS** les serveurs (Emergency).`;
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

module.exports = { handleHelpMenu };
