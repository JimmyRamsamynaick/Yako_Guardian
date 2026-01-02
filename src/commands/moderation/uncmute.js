const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'uncmute',
    description: 'Unmute un ou plusieurs membres dans le salon actuel',
    category: 'Moderation',
    usage: 'uncmute <user> | uncmute <user1>,, <user2>',
    examples: ['uncmute @user', 'uncmute @user1,, @user2'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members } = await resolveMembers(message, args);

        if (members.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.member_not_found', message.guild.id), []);
        }

        const summary = [];

        for (const targetMember of members) {
            try {
                await message.channel.permissionOverwrites.delete(targetMember, 'Uncmute command');

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'uncmute', 'Uncmute command');

                summary.push(await t('moderation.uncmute_success', message.guild.id, { user: targetMember.user.tag }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetMember.user.tag, error: await t('common.error_generic', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: members.length }), []);
        }

        return sendV2Message(client, message.channel.id, summaryText || await t('common.error_generic', message.guild.id), []);
    }
};
