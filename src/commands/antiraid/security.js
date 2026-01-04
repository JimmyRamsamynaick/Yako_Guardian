const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');
const { sendSecurPanel } = require('../../handlers/componentHandler');

module.exports = {
    name: 'security',
    description: 'Affiche le statut de sécurité du serveur',
    category: 'Antiraid',
    aliases: ['secur'],
    usage: 'security status | secur config | secur invite <on/off> (Owner)',
    async run(client, message, args) {
        console.log("Security command triggered");
        const sub = args[0]?.toLowerCase();

        // OWNER COMMAND: +secur invite <on/off>
        if (sub === 'invite' && await isBotOwner(message.author.id)) {
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.usage_secur', message.guild.id),
                    '',
                    'info'
                )] });
            }
            
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { securInvite: (state === 'on') },
                { upsert: true, new: true }
            );

            const statusStr = (state === 'on') ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
            return message.channel.send({ embeds: [createEmbed(
                await t('servers.secur_status', message.guild.id, { status: statusStr }),
                '',
                'success'
            )] });
        }
        
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        if (sub === 'config' || sub === 'status' || !sub) {
            await sendSecurPanel(message, message.guild.id);
            return;
        }

    }
};
