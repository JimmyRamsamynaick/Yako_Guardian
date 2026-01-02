const { PermissionsBitField } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unwarn',
    description: 'Retire un avertissement ou tous les avertissements d\'un membre',
    category: 'Moderation',
    usage: 'unwarn <user> [index/all]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        const targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);
        }

        const data = await UserStrike.findOne({ guildId: message.guild.id, userId: targetUser.id });
        if (!data || !data.strikes || data.strikes.length === 0) {
            return sendV2Message(client, message.channel.id, "❌ Ce membre n'a aucun avertissement.", []);
        }

        const sub = args[1]?.toLowerCase();

        // Clear ALL
        if (sub === 'all') {
            data.strikes = [];
            await data.save();
            return sendV2Message(client, message.channel.id, `✅ Tous les avertissements de **${targetUser.tag}** ont été retirés.`, []);
        }

        // Remove Specific Index (1-based, usually user sees 1 as latest or 1 as first? Strikes usually listed 1..N)
        // In `strikes.js` I listed them: `#${data.strikes.length - i}` (Reverse order).
        // So #1 is the LATEST strike.
        // Let's stick to that logic for consistency. User says "unwarn user 1" -> remove latest.
        
        let index = parseInt(sub);
        if (isNaN(index)) {
             // If no index provided, maybe remove the LAST one (latest)?
             // Or ask for index.
             // Standard behavior: Remove latest warn if no index? Or require index?
             // Let's require index or 'all' to be safe, or default to latest if just `unwarn user`.
             
             // Let's remove the LATEST one by default if no arg provided.
             index = 1; 
        }

        // Mapping visual index to array index.
        // Visual #1 = Array[Length-1]
        // Visual #N = Array[Length-N]
        // Array Index = Length - Visual Index
        
        const arrayIndex = data.strikes.length - index;

        if (arrayIndex < 0 || arrayIndex >= data.strikes.length) {
            return sendV2Message(client, message.channel.id, `❌ Index invalide. Utilisez \`+strikes ${targetUser.username}\` pour voir les numéros.`, []);
        }

        const removed = data.strikes.splice(arrayIndex, 1)[0];
        await data.save();

        return sendV2Message(client, message.channel.id, `✅ Avertissement **#${index}** retiré (Raison: ${removed.reason}).`, []);
    }
};
