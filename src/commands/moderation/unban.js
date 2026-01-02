const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unban',
    description: 'Débannit un utilisateur du serveur',
    category: 'Moderation',
    usage: 'unban <id_utilisateur> [raison]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        const userId = args[0];
        if (!userId) {
            return sendV2Message(client, message.channel.id, "❌ Veuillez fournir l'ID de l'utilisateur à débannir.", []);
        }

        const reason = args.slice(1).join(' ') || "Aucune raison fournie";

        try {
            // Check if ban exists (optional, but good practice)
            const ban = await message.guild.bans.fetch(userId).catch(() => null);
            if (!ban) {
                return sendV2Message(client, message.channel.id, "❌ Cet utilisateur n'est pas banni.", []);
            }

            await message.guild.members.unban(userId, reason);
            return sendV2Message(client, message.channel.id, `✅ **${ban.user ? ban.user.tag : userId}** a été débanni.\nRaison: *${reason}*`, []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors du débannissement (ID invalide ?).", []);
        }
    }
};
