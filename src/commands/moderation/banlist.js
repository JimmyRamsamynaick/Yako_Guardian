const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'banlist',
    description: 'banlist.description',
    category: 'Moderation',
    usage: 'banlist.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.banlist_title', message.guild.id, { count: '...' }), `${THEME.icons.loading} ${await t('moderation.banlist_loading', message.guild.id)}`, 'loading')] });

        const bans = await message.guild.bans.fetch().catch(() => null);

        if (!bans || bans.size === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('moderation.banlist_title', message.guild.id, { count: 0 }), await t('moderation.banlist_empty', message.guild.id), 'info')] });
        }

        // Map bans to string
        const description = await Promise.all(Array.from(bans.values()).map(async ban => {
            return `**${ban.user.tag}** (${ban.user.id})\n└ ${await t('moderation.reason_none', message.guild.id).then(none => ban.reason || none)}`;
        }));

        const embed = createEmbed(
            await t('moderation.banlist_title', message.guild.id, { count: bans.size }),
            description.slice(0, 20).join('\n\n'),
            'primary'
        );

        if (bans.size > 20) {
            embed.setFooter({ text: await t('moderation.mutelist_footer', message.guild.id, { count: bans.size - 20 }) });
        }

        return replyMsg.edit({ embeds: [embed] });
    }
};
