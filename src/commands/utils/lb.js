const { createPagination } = require('../../utils/pagination');
const Suggestion = require('../../database/models/Suggestion');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'lb',
    description: 'Affiche les classements',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        if (sub === 'suggestions') {
            const suggestions = await Suggestion.find({ guildId: message.guild.id }).sort({ upvotes: -1 });
            const list = suggestions.map(s => `**${s.content}** - 👍 ${s.upvotes} | 👎 ${s.downvotes}`);
            return createPagination(client, message, list, 10, await t('lb.suggestions_title', message.guild.id));
        }

        return sendV2Message(client, message.channel.id, await t('lb.usage', message.guild.id), []);
    }
};