const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unmute',
    description: 'Retire le mute d\'un membre (Timeout ou Rôle)',
    category: 'Moderation',
    usage: 'unmute <user> [raison]',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        
        if (!targetMember) {
            return sendV2Message(client, message.channel.id, "❌ Membre introuvable.", []);
        }

        const reason = args.slice(1).join(' ') || "Aucune raison fournie";
        const config = await getGuildConfig(message.guild.id);
        const useTimeout = config.moderation?.timeoutEnabled !== false; // Default true

        try {
            let actionText = "";
            let performed = false;

            // 1. Try Remove Timeout
            if (targetMember.communicationDisabledUntilTimestamp > Date.now()) {
                if (targetMember.moderatable) {
                    await targetMember.timeout(null, reason);
                    actionText += "Timeout retiré. ";
                    performed = true;
                } else {
                    actionText += "❌ Impossible de retirer le Timeout (Perms insuffisantes). ";
                }
            }

            // 2. Try Remove Mute Role (Always check if role exists and user has it, regardless of current 'useTimeout' setting, to clean up)
            const roleId = config.moderation?.muteRole;
            if (roleId) {
                const role = message.guild.roles.cache.get(roleId);
                if (role && targetMember.roles.cache.has(roleId)) {
                    if (targetMember.manageable) { // Check if bot can manage role
                         await targetMember.roles.remove(role, reason);
                         actionText += "Rôle Mute retiré.";
                         performed = true;
                    } else {
                         actionText += "❌ Impossible de retirer le Rôle Mute (Hiérarchie ?).";
                    }
                }
            }

            if (!performed && !actionText) {
                return sendV2Message(client, message.channel.id, "❌ Ce membre n'est pas mute (ni Timeout, ni Rôle).", []);
            }

            return sendV2Message(client, message.channel.id, `✅ **${targetMember.user.tag}** a été unmute.\n${actionText}\nRaison: *${reason}*`, []);

        } catch (err) {
            console.error(err);
            return sendV2Message(client, message.channel.id, "❌ Une erreur est survenue lors du unmute.", []);
        }
    }
};
