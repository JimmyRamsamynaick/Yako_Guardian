const { sendV2Message } = require('../../utils/componentUtils');
const { createTicket } = require('../../utils/modmailUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'openmodmail',
    description: 'Ouvrir un ticket Modmail avec un membre',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return sendV2Message(client, message.channel.id, await t('openmodmail.permission', message.guild.id), []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            return sendV2Message(client, message.channel.id, await t('openmodmail.usage', message.guild.id), []);
        }

        try {
            // Use standard createTicket function to ensure DB consistency
            const channel = await createTicket(client, member.user, message.guild, await t('modmail.openmodmail.manual_open', message.guild.id, { user: message.author }));
            
            // Notify staff in the channel
            await channel.send(`${message.author} a ouvert ce ticket avec ${member}.`);
            
            sendV2Message(client, message.channel.id, await t('modmail.openmodmail.opened', message.guild.id, { channel }), []);
        } catch (error) {
            sendV2Message(client, message.channel.id, await t('modmail.openmodmail.error', message.guild.id, { error: error.message }), []);
        }
    }
};