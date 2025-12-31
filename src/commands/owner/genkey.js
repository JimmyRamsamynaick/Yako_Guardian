const { generateKey } = require('../../utils/subscription');

module.exports = {
    name: 'genkey',
    run: async (client, message, args) => {
        // Owner Check
        if (message.author.id !== process.env.OWNER_ID) return;
        
        const days = parseInt(args[0]);
        if (!days || isNaN(days)) return message.reply("Usage: `+genkey <jours>`");
        
        const key = generateKey(days);
        
        // Send key in DM to avoid leaking
        try {
            await message.author.send(`**Nouvelle Clé de Licence générée :**\n\`${key}\`\nDurée: ${days} jours.`);
            message.reply("Clé générée et envoyée en DM.");
        } catch (e) {
            message.reply(`**Clé générée :** \`${key}\` (${days} jours)\n*(Impossible de vous envoyer un DM)*`);
        }
    }
};
