const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'ban',
    description: 'Bannit un membre du serveur',
    category: 'Moderation',
    usage: 'ban <user> [raison]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        
        // Allow banning by ID even if not in server
        let targetUser = targetMember ? targetMember.user : await client.users.fetch(args[0]).catch(() => null);

        if (!targetUser) {
            return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);
        }

        if (targetMember && !targetMember.bannable) {
            return sendV2Message(client, message.channel.id, "❌ Je ne peux pas bannir ce membre (Rôle supérieur ou égal au mien).", []);
        }

        if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas bannir ce membre (Rôle supérieur ou égal).", []);
        }

        const reason = args.slice(1).join(' ') || "Aucune raison fournie";

        try {
            await targetUser.send(`Vous avez été banni de **${message.guild.name}**\nRaison: ${reason}`).catch(() => {});
            await message.guild.members.ban(targetUser.id, { reason });
            return sendV2Message(client, message.channel.id, `✅ **${targetUser.tag}** a été banni.\nRaison: *${reason}*`, []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors du bannissement.", []);
        }
    }
};
