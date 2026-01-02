const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');
const { deleteSanction } = require('../../utils/moderation/sanctionUtils');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'del',
    aliases: ['remove'],
    description: 'Supprime un membre d\'un ticket OU une sanction',
    category: 'General',
    usage: 'del <membre> | del sanction <id>',
    async run(client, message, args) {
        
        // --- DEL SANCTION ---
        if (args[0]?.toLowerCase() === 'sanction') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.channel.send({ embeds: [createEmbed(await t('common.admin_only', message.guild.id), '', 'error')] });
            }

            // Args: del sanction <member> <caseId> OR del sanction <caseId>
            let caseId = args[1];
            
            // Check if args[1] is a mention or ID (member)
            if (args[1]?.match(/^<@!?(\d+)>$/) || (args[1]?.length > 15 && isNaN(args[1]))) {
                // It's a member, so caseId is args[2]
                caseId = args[2];
            }

            if (!caseId || isNaN(caseId)) {
                return message.channel.send({ embeds: [createEmbed(await t('ticket_del.sanction_usage', message.guild.id), '', 'info')] });
            }

            const result = await deleteSanction(message.guild.id, parseInt(caseId));

            if (result) {
                return message.channel.send({ embeds: [createEmbed(await t('ticket_del.sanction_success', message.guild.id, { caseId }), '', 'success')] });
            } else {
                return message.channel.send({ embeds: [createEmbed(await t('ticket_del.sanction_not_found', message.guild.id, { caseId }), '', 'error')] });
            }
        }

        // --- TICKET DEL (Default) ---
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_del.not_ticket', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_del.usage', message.guild.id), '', 'info')] });
        }

        try {
            await message.channel.permissionOverwrites.delete(member);
            return message.channel.send({ embeds: [createEmbed(await t('ticket_del.success', message.guild.id, { user: member.id }), '', 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_del.error', message.guild.id), '', 'error')] });
        }
    }
};
