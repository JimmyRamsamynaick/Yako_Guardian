const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createBackup, loadBackup } = require('../../utils/backupHandler');
const { sendV2Message } = require('../../utils/componentUtils');
const Backup = require('../../database/models/Backup');

module.exports = {
    name: 'backup',
    description: 'Système de sauvegarde du serveur',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ **Permission Refusée**\nVous devez être Administrateur pour gérer les backups.", []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;
        const name = args[1];

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                "**💾 SYSTÈME DE BACKUP**\n\n" +
                "`+backup create <nom>` : Créer une sauvegarde.\n" +
                "`+backup load <nom>` : Charger une sauvegarde (Danger!).\n" +
                "`+backup delete <nom>` : Supprimer une sauvegarde.\n" +
                "`+backup list` : Voir vos sauvegardes.",
                []
            );
        }

        try {
            if (sub === 'create') {
                if (!name) return sendV2Message(client, message.channel.id, "❌ Précisez un nom pour la backup.", []);
                
                await sendV2Message(client, message.channel.id, "⏳ Création de la sauvegarde en cours...", []);
                await createBackup(message.guild, name);
                
                return sendV2Message(client, message.channel.id, `✅ **Sauvegarde créée avec succès**\nNom: \`${name}\``, []);
            }

            if (sub === 'list') {
                const backups = await Backup.find({ guild_id: message.guild.id });
                if (backups.length === 0) {
                    return sendV2Message(client, message.channel.id, "📂 Aucune sauvegarde trouvée.", []);
                }

                const list = backups.map(b => `• **${b.name}** (${new Date(b.created_at).toLocaleDateString()})`).join('\n');
                return sendV2Message(client, message.channel.id, `**📂 LISTE DES SAUVEGARDES**\n\n${list}`, []);
            }

            if (sub === 'load') {
                if (!name) return sendV2Message(client, message.channel.id, "❌ Précisez le nom de la backup à charger.", []);
                
                const backup = await Backup.findOne({ guild_id: message.guild.id, name: name });
                if (!backup) return sendV2Message(client, message.channel.id, `❌ Aucune backup trouvée avec le nom \`${name}\`.`, []);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`backup_confirm_load_${name}`)
                        .setLabel('CONFIRMER LE CHARGEMENT')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('backup_cancel')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Secondary)
                );

                return sendV2Message(client, message.channel.id, 
                    `⚠️ **ATTENTION** ⚠️\n\nVous êtes sur le point de charger la backup \`${name}\`.\n` +
                    "Cela va **SUPPRIMER** tous les rôles et salons actuels du serveur pour les remplacer.\n" +
                    "Cette action est irréversible.\n\nÊtes-vous sûr ?", 
                    [row]
                );
            }

            if (sub === 'delete') {
                if (!name) return sendV2Message(client, message.channel.id, "❌ Précisez le nom de la backup à supprimer.", []);

                const backup = await Backup.findOne({ guild_id: message.guild.id, name: name });
                if (!backup) return sendV2Message(client, message.channel.id, `❌ Aucune backup trouvée avec le nom \`${name}\`.`, []);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`backup_confirm_delete_${name}`)
                        .setLabel('Confirmer la suppression')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('backup_cancel')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Secondary)
                );

                return sendV2Message(client, message.channel.id, 
                    `🗑️ **Suppression de Backup**\n\nVoulez-vous vraiment supprimer la backup \`${name}\` ?`, 
                    [row]
                );
            }

        } catch (error) {
            console.error(error);
            return sendV2Message(client, message.channel.id, `❌ Une erreur est survenue: ${error.message}`, []);
        }
    }
};