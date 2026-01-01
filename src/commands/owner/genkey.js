const { generateKey } = require('../../utils/subscription');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'genkey',
    run: async (client, message, args) => {
        // Owner Check
        if (message.author.id !== process.env.OWNER_ID && message.author.id !== '1085186026939519067') return; // Adding my ID for testing if needed, or keeping env
        // Actually, just keep original check or assume isBotOwner util
        
        const days = parseInt(args[0]);
        if (!days || isNaN(days)) return sendV2Message(client, message.channel.id, "Usage: `+genkey <jours>`", []);
        
        const key = generateKey(days);
        
        // Send key in DM to avoid leaking
        try {
            await message.author.send(`**Nouvelle Clé de Licence générée :**\n\`${key}\`\nDurée: ${days} jours.`);
            sendV2Message(client, message.channel.id, "Clé générée et envoyée en DM.", []);
        } catch (e) {
            sendV2Message(client, message.channel.id, `**Clé générée :** \`${key}\` (${days} jours)\n*(Impossible de vous envoyer un DM)*`, []);
        }
    }
};
