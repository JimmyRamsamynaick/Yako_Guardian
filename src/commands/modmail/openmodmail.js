const { createEmbed } = require('../../utils/design');
const { createTicket } = require('../../utils/modmailUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'openmodmail',
    description: 'Ouvrir un ticket Modmail avec un membre',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.channel.send({ embeds: [createEmbed(await t('openmodmail.permission', message.guild.id), '', 'error')] });
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return message.channel.send({ embeds: [createEmbed(await t('openmodmail.usage', message.guild.id), '', 'info')] });
        }

        try {
            // Use standard createTicket function to ensure DB consistency
            const channel = await createTicket(client, member.user, message.guild, await t('modmail.openmodmail.manual_open', message.guild.id, { user: message.author }));
            
            // Notify staff in the channel
            await channel.send(`${message.author} a ouvert ce ticket avec ${member}.`);
            
            message.channel.send({ embeds: [createEmbed(await t('modmail.openmodmail.opened', message.guild.id, { channel }), '', 'success')] });
        } catch (error) {
            message.channel.send({ embeds: [createEmbed(await t('modmail.openmodmail.error', message.guild.id, { error: error.message }), '', 'error')] });
        }
    }
};