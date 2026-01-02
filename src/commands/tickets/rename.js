const { sendV2Message } = require('../../utils/componentUtils');
const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'rename',
    description: 'Renommer un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return sendV2Message(client, message.channel.id, await t('ticket_rename.not_ticket', message.guild.id), []);
        }

        const newName = args.join('-');
        if (!newName) {
            return sendV2Message(client, message.channel.id, await t('ticket_rename.usage', message.guild.id), []);
        }

        try {
            await message.channel.setName(newName);
            return sendV2Message(client, message.channel.id, await t('ticket_rename.success', message.guild.id, { name: newName }), []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, await t('ticket_rename.error', message.guild.id), []);
        }
    }
};
