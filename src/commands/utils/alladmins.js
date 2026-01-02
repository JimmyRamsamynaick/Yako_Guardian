const { createPagination } = require('../../utils/pagination');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'alladmins',
    description: 'Liste des membres (hors bots) ayant la permission administrateur',
    category: 'Utils',
    async run(client, message, args) {
        if (message.guild.memberCount !== message.guild.members.cache.size) {
            await message.guild.members.fetch();
        }

        const admins = message.guild.members.cache
            .filter(m => !m.user.bot && m.permissions.has(PermissionsBitField.Flags.Administrator))
            .map(m => m.user.tag);
        
        await createPagination(client, message, admins, 10, await t('alladmins.title', message.guild.id));
    }
};