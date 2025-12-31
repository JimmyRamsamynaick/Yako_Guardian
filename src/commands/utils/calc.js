const { sendV2Message } = require('../../utils/componentUtils');
const math = require('mathjs');

module.exports = {
    name: 'calc',
    description: 'Résout des calculs mathématiques',
    category: 'Utils',
    async run(client, message, args) {
        const expr = args.join(' ');
        if (!expr) return sendV2Message(client, message.channel.id, "❌ Veuillez spécifier un calcul.", []);

        try {
            const result = math.evaluate(expr);
            await sendV2Message(client, message.channel.id, `**Calcul:** \`${expr}\`\n**Résultat:** \`${result}\``, []);
        } catch (e) {
            return sendV2Message(client, message.channel.id, "❌ Calcul invalide.", []);
        }
    }
};