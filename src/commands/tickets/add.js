const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'add',
    description: 'Ajouter un membre au ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, await t('ticket_add.not_ticket', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, await t('ticket_add.usage', message.guild.id), []);
        }

        try {
            await message.channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            return sendV2Message(client, message.channel.id, await t('ticket_add.success', message.guild.id, { user: member.id }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('ticket_add.error', message.guild.id), []);
        }
    }
};
