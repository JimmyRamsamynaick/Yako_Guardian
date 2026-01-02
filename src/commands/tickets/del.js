const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'del',
    aliases: ['remove'],
    description: 'Retirer un membre du ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, await t('ticket_del.not_ticket', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, await t('ticket_del.usage', message.guild.id), []);
        }

        // Prevent removing the ticket creator or staff (optional but good practice)
        // For now, just remove permission.

        try {
            await message.channel.permissionOverwrites.delete(member);
            // Or explicitly deny
            // await message.channel.permissionOverwrites.edit(member, { ViewChannel: false });
            
            return sendV2Message(client, message.channel.id, await t('ticket_del.success', message.guild.id, { user: member.id }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('ticket_del.error', message.guild.id), []);
        }
    }
};
