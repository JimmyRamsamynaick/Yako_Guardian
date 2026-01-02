const { createPagination } = require('../../utils/pagination');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'boosters',
    description: 'Liste des membres boostant le serveur',
    category: 'Utils',
    async run(client, message, args) {
        if (message.guild.memberCount !== message.guild.members.cache.size) {
            await message.guild.members.fetch();
        }

        const boosters = message.guild.members.cache
            .filter(m => m.premiumSince)
            .map(m => `${m.user.tag} (depuis <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>)`);
            
        await createPagination(client, message, boosters, 10, await t('boosters.title', message.guild.id));
    }
};