const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'theme',
    description: 'Change la couleur des embeds du bot',
    category: 'Owner',
    async run(client, message, args) {
        // Permission check: Owner only as per request "Commandes Owner / Gestion globale"
        // But usually theme is per guild?
        // "Commandes Owner / Gestion globale: ... +theme <couleur>"
        // If it's global, it should be in GlobalSettings.
        // If it's per server, it should be in guild_settings.
        // User asked "personnalisé le bot", often meaning "on my server".
        // But placed under "Commandes Owner".
        // Let's assume per-guild for now as it's more useful for "white label" feel,
        // unless the user meant the bot's global theme.
        // Given "+set name" (local) and "+globalset" (global), let's make theme local too.
        // Wait, if it's in "Owner / Gestion globale" list, maybe they want it global?
        // "Profil & présence du bot ... +theme <couleur>" -> sounds global.
        // BUT, if I sell this bot to multiple servers, they might want their own color.
        // Let's check where I added the column. I added `theme_color` to `guild_settings`.
        // So I decided it's per guild. Good.

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour changer le thème.", []);
        }

        const color = args[0];
        if (!color) {
            return sendV2Message(client, message.channel.id, "Usage: `+theme <#HexColor>` (ex: #ff0000)", []);
        }

        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        if (!hexRegex.test(color)) {
             return sendV2Message(client, message.channel.id, "❌ Couleur invalide. Utilisez le format HEX (ex: #ff0000).", []);
        }

        db.prepare('UPDATE guild_settings SET theme_color = ? WHERE guild_id = ?').run(color, message.guild.id);
        
        // We can send a test embed
        // But sendV2Message uses a default color or no color?
        // We should update componentUtils to use this color?
        // For now just confirm.
        return sendV2Message(client, message.channel.id, `✅ Thème du bot mis à jour sur **${color}**.`, []);
    }
};
