const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'kick',
    description: 'Expulse un membre du serveur',
    category: 'Moderation',
    usage: 'kick <user> [raison]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'KickMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, "❌ Membre introuvable.", []);
        }

        if (!targetMember.kickable) {
            return sendV2Message(client, message.channel.id, "❌ Je ne peux pas expulser ce membre (Rôle supérieur ou égal au mien).", []);
        }

        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas expulser ce membre (Rôle supérieur ou égal).", []);
        }

        const reason = args.slice(1).join(' ') || "Aucune raison fournie";

        try {
            await targetMember.send(`Vous avez été expulsé de **${message.guild.name}**\nRaison: ${reason}`).catch(() => {});
            await targetMember.kick(reason);
            return sendV2Message(client, message.channel.id, `✅ **${targetMember.user.tag}** a été expulsé.\nRaison: *${reason}*`, []);
        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors de l'expulsion.", []);
        }
    }
};
