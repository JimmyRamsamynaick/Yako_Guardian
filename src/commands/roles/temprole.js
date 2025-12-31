const TempRole = require('../../database/models/TempRole');
const { sendV2Message } = require('../../utils/componentUtils');
const ms = require('ms'); // We need to install 'ms' if not present, or use a helper function. 
// Assuming 'ms' is not installed, I'll write a simple parser or assume it is available. 
// Usually I should check package.json. If not, I'll use a simple regex parser.

// Simple duration parser function
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's') return val * 1000;
    if (unit === 'm') return val * 60 * 1000;
    if (unit === 'h') return val * 60 * 60 * 1000;
    if (unit === 'd') return val * 24 * 60 * 60 * 1000;
    return null;
}

module.exports = {
    name: 'temprole',
    description: 'Donner un rôle temporaire à un membre',
    category: 'Rôles',
    async run(client, message, args) {
        // Permissions
        if (!message.member.permissions.has('ManageRoles') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission `Gérer les rôles`.", []);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        const durationStr = args[2];

        if (!member || !role || !durationStr) {
            return sendV2Message(client, message.channel.id, 
                "**Utilisation:** `+temprole <@membre> <@role> <durée>`\n" +
                "Exemple: `+temprole @User @Vip 1d` (1d = 1 jour, 1h = 1 heure, 30m = 30 minutes)", 
                []
            );
        }

        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            return sendV2Message(client, message.channel.id, "❌ Format de durée invalide. Utilisez s/m/h/d (ex: 30m, 1h, 1d).", []);
        }

        // Check hierarchy
        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas gérer un rôle supérieur ou égal au vôtre.", []);
        }

        try {
            await member.roles.add(role);
            
            const expiresAt = new Date(Date.now() + durationMs);
            
            // Save to DB
            const newTempRole = new TempRole({
                guild_id: message.guild.id,
                user_id: member.id,
                role_id: role.id,
                expires_at: expiresAt
            });
            await newTempRole.save();

            sendV2Message(client, message.channel.id, 
                `✅ **Rôle Temporaire Ajouté**\n` +
                `👤 **Membre:** ${member.user.tag}\n` +
                `🛡️ **Rôle:** ${role.name}\n` +
                `⏳ **Durée:** ${durationStr}\n` +
                `📅 **Expire:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, 
                []
            );

        } catch (error) {
            console.error(error);
            sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors de l'ajout du rôle.", []);
        }
    }
};