const { createPagination } = require('../../utils/pagination');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'rolemembers',
    description: 'Liste des membres ayant un rôle précis',
    category: 'Utils',
    async run(client, message, args) {
        const roleId = args[0]?.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        
        if (!role) {
            return message.channel.send({ embeds: [createEmbed(await t('rolemembers.not_found', message.guild.id), '', 'error')] });
        }

        await message.guild.members.fetch();

        const members = role.members.map(m => m.user.tag);
        await createPagination(client, message, members, 10, await t('rolemembers.title', message.guild.id, { name: role.name }));
    }
};