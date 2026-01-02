const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');
const ms = require('ms');

module.exports = {
    name: 'mute',
    description: 'Mute un membre (Timeout ou Rôle)',
    category: 'Moderation',
    usage: 'mute <user> <durée> [raison]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, "❌ Membre introuvable.", []);
        }

        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez pas mute ce membre (Rôle supérieur ou égal).", []);
        }

        const durationStr = args[1];
        let duration = null;
        try {
            duration = ms(durationStr);
        } catch {
            // pass
        }

        if (!duration || duration < 1000 || duration > 2419200000) { // Max 28 days for timeout
            return sendV2Message(client, message.channel.id, "❌ Durée invalide (Ex: 10m, 1h, 1d). Max 28 jours.", []);
        }

        const reason = args.slice(2).join(' ') || "Aucune raison fournie";

        const config = await getGuildConfig(message.guild.id);
        const useTimeout = config.moderation?.timeoutEnabled !== false; // Default true

        try {
            let actionText = "";
            
            if (useTimeout) {
                // Use Discord Timeout
                if (!targetMember.moderatable) {
                     return sendV2Message(client, message.channel.id, "❌ Je ne peux pas timeout ce membre.", []);
                }
                await targetMember.timeout(duration, reason);
                actionText = `Timeout (${durationStr})`;
            } else {
                // Use Mute Role
                const roleId = config.moderation?.muteRole;
                if (!roleId) return sendV2Message(client, message.channel.id, "❌ Rôle Mute non configuré et Timeout désactivé.", []);
                
                const role = message.guild.roles.cache.get(roleId);
                if (!role) return sendV2Message(client, message.channel.id, "❌ Rôle Mute introuvable.", []);

                await targetMember.roles.add(role, reason);
                
                // Remove role after duration
                setTimeout(async () => {
                    const mem = await message.guild.members.fetch(targetMember.id).catch(() => null);
                    if (mem) mem.roles.remove(role, "Mute expired").catch(() => {});
                }, duration);

                actionText = `Muted Role (${durationStr})`;
            }

            targetMember.send(`Vous avez été mute sur **${message.guild.name}**\nDurée: ${durationStr}\nRaison: ${reason}`).catch(() => {});
            return sendV2Message(client, message.channel.id, `✅ **${targetMember.user.tag}** a été mute.\nAction: ${actionText}\nRaison: *${reason}*`, []);

        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors du mute.", []);
        }
    }
};
