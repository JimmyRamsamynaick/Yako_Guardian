const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'banlist',
    description: 'Affiche la liste des bannissements actifs',
    category: 'Moderation',
    usage: 'banlist',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        const bans = await message.guild.bans.fetch().catch(() => null);

        if (!bans || bans.size === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.banlist_empty', message.guild.id), []);
        }

        const embed = new EmbedBuilder()
            .setTitle(await t('moderation.banlist_title', message.guild.id, { count: bans.size }))
            .setColor('#ff0000')
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        // Map bans to string
        const description = await Promise.all(Array.from(bans.values()).map(async ban => {
            return `**${ban.user.tag}** (${ban.user.id})\n└ ${await t('moderation.reason_none', message.guild.id).then(none => ban.reason || none)}`;
        }));

        embed.setDescription(description.slice(0, 20).join('\n\n'));

        if (bans.size > 20) {
            embed.setFooter({ text: await t('moderation.mutelist_footer', message.guild.id, { count: bans.size - 20 }) });
        }

        return message.channel.send({ embeds: [embed] });
    }
};
