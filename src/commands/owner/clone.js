const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getBackupData, applyBackupData } = require('../../utils/backupHandler');
const { isBotOwner } = require('../../utils/ownerUtils');
const Clone = require('../../database/models/Clone');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'clone',
    description: 'Copier/Coller un serveur (Owner Only)',
    category: 'Owner',
    usage: 'clone <copy/paste> <code>',
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const sub = args[0]?.toLowerCase();
        const code = args[1];

        if (!sub || !code) {
            return message.channel.send({ embeds: [createEmbed(
                'Clone System',
                '`+clone copy <code>` - Copier ce serveur\n`+clone paste <code>` - Coller sur ce serveur',
                'info'
            )] });
        }

        if (sub === 'copy') {
            const msg = await message.channel.send({ embeds: [createEmbed('Copie en cours...', '', 'loading')] });
            
            try {
                const data = await getBackupData(message.guild);
                await Clone.findOneAndUpdate(
                    { code: code },
                    { data: data, created_at: Date.now() },
                    { upsert: true, new: true }
                );
                
                return msg.edit({ embeds: [createEmbed(
                    'Serveur Copié !',
                    `Les données du serveur ont été sauvegardées sous le code : \`${code}\``,
                    'success'
                )] });
            } catch (e) {
                console.error(e);
                return msg.edit({ embeds: [createEmbed('Erreur', e.message, 'error')] });
            }
        }

        if (sub === 'paste') {
            const cloneDoc = await Clone.findOne({ code: code });
            if (!cloneDoc) {
                return message.channel.send({ embeds: [createEmbed('Erreur', 'Aucun clone trouvé avec ce code.', 'error')] });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_clone_paste')
                    .setLabel('CONFIRMER LE REMPLACEMENT')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_clone_paste')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );

            const msg = await message.channel.send({
                embeds: [createEmbed(
                    '⚠️ ATTENTION ⚠️',
                    `Vous êtes sur le point de remplacer **tout ce serveur** par le contenu du clone \`${code}\`.\n\n**TOUS LES SALONS ET RÔLES SERONT SUPPRIMÉS.**\n\nConfirmez-vous ?`,
                    'warning'
                )],
                components: [row]
            });

            const filter = i => i.user.id === message.author.id;
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 30000 });

            collector.on('collect', async i => {
                if (i.customId === 'cancel_clone_paste') {
                    await i.update({ embeds: [createEmbed('Annulé', 'Opération annulée.', 'error')], components: [] });
                    return;
                }

                if (i.customId === 'confirm_clone_paste') {
                    await i.update({ embeds: [createEmbed('Chargement...', 'Suppression et application du clone...', 'loading')], components: [] });
                    
                    try {
                        await applyBackupData(message.guild, cloneDoc.data);
                        
                        // Le salon d'origine n'existe plus, on essaie d'envoyer un MP ou de trouver un nouveau salon
                        try {
                            await message.author.send({ embeds: [createEmbed('Succès', 'Le clone a été appliqué avec succès sur le serveur !', 'success')] });
                        } catch (dmError) {
                            // Si MP échoue, on cherche le premier salon textuel disponible
                            const firstChannel = message.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(message.guild.members.me).has('SendMessages'));
                            if (firstChannel) {
                                await firstChannel.send({ embeds: [createEmbed('Succès', 'Le clone a été appliqué avec succès !', 'success')] }).catch(() => {});
                            }
                        }
                    } catch (e) {
                        console.error(e);
                        // On essaie d'envoyer l'erreur en MP car le salon n'existe peut-être plus
                        try {
                            await message.author.send({ embeds: [createEmbed('Erreur Fatal', `Une erreur est survenue pendant le chargement: ${e.message}`, 'error')] });
                        } catch (dmError) {
                            console.error("Impossible d'envoyer l'erreur à l'utilisateur :", dmError);
                        }
                    }
                }
            });
        }
    }
};