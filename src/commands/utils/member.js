const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'member',
    description: 'Informations d’un membre sur le serveur',
    category: 'Utils',
    async run(client, message, args) {
        const memberId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let member;
        try {
            member = await message.guild.members.fetch(memberId);
        } catch {
            return message.channel.send({ embeds: [createEmbed(await t('member.not_found', message.guild.id), '', 'error')] });
        }

        const info = [
            `**${await t('member.nickname', message.guild.id)}:** ${member.nickname || await t('member.none', message.guild.id)}`,
            `**${await t('member.joined_at', message.guild.id)}:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
            `**${await t('member.boost_since', message.guild.id)}:** ${member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : await t('member.no', message.guild.id)}`,
            `**${await t('member.highest_role', message.guild.id)}:** ${member.roles.highest}`,
            `**${await t('member.roles', message.guild.id)}:** ${member.roles.cache.size - 1}` // Exclude @everyone
        ].join('\n');

        await message.channel.send({ embeds: [createEmbed(await t('member.title', message.guild.id, { tag: member.user.tag }), info, 'info')] });
    }
};