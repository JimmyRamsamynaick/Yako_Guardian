const ActiveTicket = require('../../database/models/ActiveTicket');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'add',
    description: 'Ajouter un membre au ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_add.not_ticket', message.guild.id), 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_add.usage', message.guild.id), 'info')] });
        }

        try {
            await message.channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            return message.channel.send({ embeds: [createEmbed('', `${THEME.icons.success} ${await t('ticket_add.success', message.guild.id, { user: member.id })}`, 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed('', await t('ticket_add.error', message.guild.id), 'error')] });
        }
    }
};
