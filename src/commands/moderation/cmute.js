const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'cmute',
    description: 'Mute un ou plusieurs membres dans le salon actuel',
    category: 'Moderation',
    usage: 'cmute <user> [raison] | cmute <user1>,, <user2> [raison]',
    examples: ['cmute @user Spam', 'cmute @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members, reason } = await resolveMembers(message, args);

        if (members.length === 0) {
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Channel Mute', `${THEME.icons.loading} Application des sanctions...`, 'loading')] });

        const summary = [];
        let successCount = 0;

        for (const targetMember of members) {
             if (targetMember.id === message.author.id) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.self_sanction', message.guild.id)}`);
                continue;
            }
            if (targetMember.id === client.user.id) {
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.bot_sanction', message.guild.id)}`);
                continue;
            }

            // Check if user has Admin permissions in this channel
            const perms = message.channel.permissionsFor(targetMember);
            if (perms && perms.has(PermissionsBitField.Flags.Administrator)) {
                 summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('moderation.admin_sanction', message.guild.id)}`);
                 continue;
            }

            try {
                await message.channel.permissionOverwrites.create(targetMember, {
                    SendMessages: false,
                    AddReactions: false
                }, { reason });

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'cmute', reason, null, message.channel.id);

                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.cmute_success', message.guild.id, { user: '', reason })}`);
                successCount++;
            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        const summaryText = summary.join('\n');
        
        await replyMsg.edit({ embeds: [createEmbed(
            'Channel Mute', 
            summaryText || await t('common.error_generic', message.guild.id), 
            successCount > 0 ? 'success' : 'error'
        )] });
    }
};
