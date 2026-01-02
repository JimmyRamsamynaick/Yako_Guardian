const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');

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
                return sendV2Message(client, message.channel.id, await t('reset.server_owner_only', message.guild.id), []);
            }

            // Confirm
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_reset_server').setLabel(await t('reset.confirm_reset_server_label', message.guild.id)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_reset').setLabel(await t('reset.cancel_label', message.guild.id)).setStyle(ButtonStyle.Secondary)
            );

            return sendV2Message(client, message.channel.id, await t('reset.warning_server', message.guild.id), [row]);
        }

        // --- RESET ALL (Owner Only) ---
        if (commandName === 'resetall') {
            if (!await isBotOwner(message.author.id)) return;

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_reset_all').setLabel(await t('reset.confirm_reset_all_label', message.guild.id)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_reset').setLabel(await t('reset.cancel_label', message.guild.id)).setStyle(ButtonStyle.Secondary)
            );

            return sendV2Message(client, message.channel.id, await t('reset.warning_all', message.guild.id), [row]);
        }
    }
};
