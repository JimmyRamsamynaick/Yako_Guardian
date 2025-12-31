const { sendV2Message } = require('../../utils/componentUtils');
const Suggestion = require('../../database/models/Suggestion');

module.exports = {
    name: 'suggestion',
    description: 'Poste une suggestion',
    category: 'Utils',
    async run(client, message, args) {
        const content = args.join(' ');
        if (!content) return sendV2Message(client, message.channel.id, "❌ Veuillez écrire votre suggestion.", []);

        const suggestion = new Suggestion({
            guildId: message.guild.id,
            authorId: message.author.id,
            content: content
        });
        await suggestion.save();

        await sendV2Message(client, message.channel.id, "✅ Suggestion enregistrée !", []);
    }
};