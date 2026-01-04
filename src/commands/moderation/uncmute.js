const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { resolveMembers } = require('../../utils/moderation/memberUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'uncmute',
    description: 'uncmute.description',
    category: 'Moderation',
    usage: 'uncmute.usage',
    examples: ['uncmute @user', 'uncmute @user1,, @user2'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ManageChannels' }), 'error')] });
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const { members } = await resolveMembers(message, args);

        if (members.length === 0) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.uncmute_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.uncmute_process', message.guild.id)}`, 'loading')] });

        const summary = [];
        let successCount = 0;

        for (const targetMember of members) {
            try {
                await message.channel.permissionOverwrites.delete(targetMember, 'Uncmute command');

                // Log Sanction
                await addSanction(message.guild.id, targetMember.id, message.author.id, 'uncmute', 'Uncmute command');

                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.uncmute_success', message.guild.id, { user: '' })}`);
                successCount++;
            } catch (err) {
                console.error(err);
                summary.push(`${THEME.icons.error} **${targetMember.user.tag}**: ${await t('common.error_generic', message.guild.id)}`);
            }
        }

        const summaryText = summary.join('\n');
        
        await replyMsg.edit({ embeds: [createEmbed(
            await t('moderation.uncmute_title', message.guild.id),
            summaryText || await t('common.error_generic', message.guild.id),
            successCount > 0 ? 'success' : 'error'
        )] });
    }
};
