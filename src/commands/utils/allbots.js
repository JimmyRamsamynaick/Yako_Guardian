const { createPagination } = require('../../utils/pagination');

module.exports = {
    name: 'allbots',
    description: 'Liste des bots présents sur le serveur',
    category: 'Utils',
    async run(client, message, args) {
        // Ensure members are fetched if cache is empty, but usually for large servers we might miss some.
        // Assuming cache is relatively populated or we can fetch.
        // For strict correctness: await message.guild.members.fetch();
        // But for performance on huge servers, maybe just cache.
        // Given the prompt asks for "Liste des bots", I'll trust cache or fetch if small.
        // I'll add a fetch call just in case.
        if (message.guild.memberCount !== message.guild.members.cache.size) {
            await message.guild.members.fetch();
        }
        
        const bots = message.guild.members.cache.filter(m => m.user.bot).map(m => m.user.tag);
        await createPagination(client, message, bots, 10, 'Liste des Bots');
    }
};