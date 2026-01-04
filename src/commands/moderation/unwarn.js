const { PermissionsBitField } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/design');
const UserStrike = require('../../database/models/UserStrike');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'unwarn',
    description: 'unwarn.description',
    category: 'Moderation',
    usage: 'unwarn.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        const targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.strikes_user_not_found', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.unwarn_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        const data = await UserStrike.findOne({ guildId: message.guild.id, userId: targetUser.id });
        if (!data || !data.strikes || data.strikes.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.strikes_none', message.guild.id, { user: targetUser.tag }), 'warning')] });
        }

        const sub = args[1]?.toLowerCase();

        // Clear ALL
        if (sub === 'all') {
            data.strikes = [];
            await data.save();
            return replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.unwarn_success_all', message.guild.id, { user: targetUser.tag }), 'success')] });
        }

        // Remove Specific Index
        let index = parseInt(sub);
        if (isNaN(index)) {
             index = 1; // Default to latest
        }

        // Mapping visual index to array index.
        const arrayIndex = data.strikes.length - index;

        if (arrayIndex < 0 || arrayIndex >= data.strikes.length) {
            return replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.unwarn_invalid_index', message.guild.id), 'error')] });
        }

        const removed = data.strikes.splice(arrayIndex, 1)[0];
        await data.save();

        return replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('moderation.unwarn_success_index', message.guild.id, { index, reason: removed.reason }), 'success')] });
    }
};
