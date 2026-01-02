const ActiveTicket = require('../../database/models/ActiveTicket');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'rename',
    description: 'Renommer un ticket',
    category: 'Tickets',
    async run(client, message, args) {
        const ticket = await ActiveTicket.findOne({ channelId: message.channel.id });
        if (!ticket) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_rename.not_ticket', message.guild.id), '', 'error')] });
        }

        const newName = args.join('-');
        if (!newName) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_rename.usage', message.guild.id), '', 'info')] });
        }

        try {
            await message.channel.setName(newName);
            return message.channel.send({ embeds: [createEmbed(await t('ticket_rename.success', message.guild.id, { name: newName }), '', 'success')] });
        } catch (e) {
            return message.channel.send({ embeds: [createEmbed(await t('ticket_rename.error', message.guild.id), '', 'error')] });
        }
    }
};
