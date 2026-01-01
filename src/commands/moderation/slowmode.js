const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'slowmode',
    description: 'Définit le mode lent (slowmode) sur un salon',
    category: 'Moderation',
    aliases: ['slow'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Gérer les salons` requise.", []);
        }

        const durationStr = args[0];
        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;

        if (!durationStr) {
            return sendV2Message(client, message.channel.id, "**Usage:** `+slowmode <durée/off> [salon]`\nEx: `+slowmode 10s`, `+slowmode 1h #général`, `+slowmode off`", []);
        }

        let seconds = 0;
        if (durationStr.toLowerCase() === 'off') {
            seconds = 0;
        } else {
            const match = durationStr.match(/^(\d+)(s|m|h)?$/);
            if (!match) {
                return sendV2Message(client, message.channel.id, "❌ Durée invalide. Ex: `5s`, `10m`, `1h` (Max 6h).", []);
            }
            const amount = parseInt(match[1]);
            const unit = match[2] || 's';
            
            if (unit === 's') seconds = amount;
            else if (unit === 'm') seconds = amount * 60;
            else if (unit === 'h') seconds = amount * 60 * 60;
        }

        if (seconds > 21600) { // 6 hours
            return sendV2Message(client, message.channel.id, "❌ Le slowmode ne peut pas dépasser 6 heures (21600s).", []);
        }

        try {
            await channel.setRateLimitPerUser(seconds);
            if (seconds === 0) {
                return sendV2Message(client, message.channel.id, `✅ Slowmode désactivé pour <#${channel.id}>.`, []);
            } else {
                return sendV2Message(client, message.channel.id, `✅ Slowmode défini sur **${durationStr}** pour <#${channel.id}>.`, []);
            }
        } catch (e) {
            console.error(e);
            return sendV2Message(client, message.channel.id, "❌ Impossible de modifier le slowmode (Permissions ?).", []);
        }
    }
};
