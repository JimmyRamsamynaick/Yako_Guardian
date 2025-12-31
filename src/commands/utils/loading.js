const { sendV2Message } = require('../../utils/componentUtils');

function parseDuration(str) {
    const match = str.match(/^(\d+)([s])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    return val * 1000;
}

module.exports = {
    name: 'loading',
    description: 'Afficher une barre de chargement animée',
    category: 'Utilitaire',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageMessages') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les messages` requise.", []);
        }

        const durationStr = args[0];
        const text = args.slice(1).join(' ') || 'Chargement en cours...';

        const duration = durationStr ? parseDuration(durationStr) : 5000;
        
        if (!durationStr || !duration) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+loading <durée_secondes>s [message]`\nExemple: `+loading 5s Initialisation...`", []);
        }

        const steps = 10;
        const interval = duration / steps;
        
        let progress = 0;
        
        const msg = await message.channel.send(`⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0% - ${text}`);

        const timer = setInterval(async () => {
            progress++;
            const filled = '⬛'.repeat(progress);
            const empty = '⬜'.repeat(steps - progress);
            const percentage = Math.round((progress / steps) * 100);

            try {
                if (progress >= steps) {
                    clearInterval(timer);
                    await msg.edit(`⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 100% - ${text} **Terminé !**`);
                } else {
                    await msg.edit(`${filled}${empty} ${percentage}% - ${text}`);
                }
            } catch (e) {
                clearInterval(timer); // Message deleted or error
            }
        }, interval);
    }
};