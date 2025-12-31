const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { db } = require('../../database');

module.exports = {
    name: 'reset',
    description: 'Réinitialise les données (Owner/Admin)',
    category: 'Owner',
    aliases: ['resetall'],
    async run(client, message, args) {
        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // --- RESET SERVER (Irreversible) ---
        if (commandName === 'reset' && args[0] === 'server') {
            // Check Owner or Guild Owner
            if (message.author.id !== message.guild.ownerId && !(await isBotOwner(message.author.id))) {
                return sendV2Message(client, message.channel.id, "❌ Seul le propriétaire du serveur ou un Owner du bot peut faire ça.", []);
            }

            // Confirm
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_reset_server').setLabel('CONFIRMER RESET SERVEUR').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_reset').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
            );

            return sendV2Message(client, message.channel.id, "⚠️ **ATTENTION**\nVous allez supprimer TOUTES les configurations du bot pour ce serveur (Prefix, Whitelist, Blacklist, Logs, etc.).\nCette action est irréversible.", [row]);
        }

        // --- RESET ALL (Owner Only) ---
        if (commandName === 'resetall') {
            if (!await isBotOwner(message.author.id)) return;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_reset_all').setLabel('CONFIRMER RESET TOTAL').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_reset').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
            );

            return sendV2Message(client, message.channel.id, "⚠️ **DANGER CRITIQUE**\nVous allez supprimer les configurations de **TOUS LES SERVEURS**.\nCette action est irréversible.", [row]);
        }
    }
};
