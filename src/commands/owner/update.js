const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { exec } = require('child_process');

module.exports = {
    name: 'updatebot',
    description: 'Mise à jour du bot',
    category: 'Owner',
    aliases: ['update', 'autoupdate'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();

        // --- AUTOUPDATE ---
        if (commandName === 'autoupdate') {
            const state = args[0];
            if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                return sendV2Message(client, message.channel.id, "❌ Usage: `+autoupdate <on/off>`", []);
            }

            const isEnabled = state.toLowerCase() === 'on';
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { autoUpdate: isEnabled },
                { upsert: true, new: true }
            );

            return sendV2Message(client, message.channel.id, `✅ **Auto Update** est maintenant **${isEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}**.\nLe bot vérifiera les mises à jour automatiquement.`, []);
        }

        // --- UPDATEBOT ---
        if (commandName === 'updatebot' || commandName === 'update') {
            await sendV2Message(client, message.channel.id, "🔄 **Recherche de mises à jour...**", []);
            
            // Simulation or real git pull
            exec('git pull', async (error, stdout, stderr) => {
                if (error) {
                    return sendV2Message(client, message.channel.id, `❌ Erreur lors de la mise à jour:\n\`\`\`${error.message}\`\`\``, []);
                }
                
                if (stdout.includes('Already up to date')) {
                    return sendV2Message(client, message.channel.id, "✅ Le bot est déjà à jour.", []);
                }

                await sendV2Message(client, message.channel.id, `✅ **Mise à jour téléchargée !**\n\`\`\`${stdout}\`\`\`\n🔄 Redémarrage en cours...`, []);
                
                // Restart process (if managed by PM2 or similar)
                process.exit(0); 
            });
        }
    }
};
