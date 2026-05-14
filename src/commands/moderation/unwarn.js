const { PermissionsBitField } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/design');
const UserStrike = require('../../database/models/UserStrike');
const { t } = require('../../utils/i18n');
const { resolveMembers } = require('../../utils/moderation/memberUtils');

module.exports = {
    name: 'unwarn',
    description: 'unwarn.description',
    category: 'Moderation',
    permLevel: 2,
    usage: 'unwarn.usage',
    examples: ['unwarn @user 1', 'unwarn @user all', 'unwarn @user1,, @user2 2'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        if (args.length === 0) {
            return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('unwarn.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.unwarn_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        const { members, reason: amountArg } = await resolveMembers(message, args);

        if (members.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.member_not_found', message.guild.id), 'error')] });
        }

        const summary = [];
        let totalRemoved = 0;

        for (const targetMember of members) {
            const data = await UserStrike.findOne({ guildId: message.guild.id, userId: targetMember.id });
            
            if (!data || !data.strikes || data.strikes.length === 0) {
                summary.push(`${THEME.icons.warning} **${targetMember.user.tag}**: ${await t('moderation.strikes_none_simple', message.guild.id)}`);
                continue;
            }

            const sub = amountArg?.toLowerCase().trim() || '1';

            // Clear ALL
            if (sub === 'all') {
                const count = data.strikes.length;
                data.strikes = [];
                await data.save();
                totalRemoved += count;
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.unwarn_success_all_simple', message.guild.id, { count })}`);
                continue;
            }

            // Remove Specific Amount (Default to 1)
            let amount = parseInt(sub);
            if (isNaN(amount) || amount <= 0) {
                amount = 1;
            }

            const countBefore = data.strikes.length;
            // On retire les 'amount' derniers avertissements
            data.strikes.splice(-amount);
            const countAfter = data.strikes.length;
            const removedNow = countBefore - countAfter;

            await data.save();
            totalRemoved += removedNow;

            if (removedNow > 0) {
                summary.push(`${THEME.icons.success} **${targetMember.user.tag}**: ${await t('moderation.unwarn_success_amount', message.guild.id, { count: removedNow })}`);
            } else {
                summary.push(`${THEME.icons.warning} **${targetMember.user.tag}**: ${await t('moderation.strikes_none_simple', message.guild.id)}`);
            }
        }

        const finalType = totalRemoved > 0 ? 'success' : 'error';
        const embed = createEmbed(
            await t('moderation.unwarn_title', message.guild.id),
            summary.join('\n'),
            finalType
        );

        return replyMsg.edit({ embeds: [embed] });
    }
};
