const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'mutelist',
    description: 'mutelist.description',
    category: 'Moderation',
    usage: 'mutelist.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.mutelist_title', message.guild.id, { count: '...' }), `${THEME.icons.loading} ${await t('moderation.mutelist_loading', message.guild.id)}`, 'loading')] });

        const config = await getGuildConfig(message.guild.id);
        const muteRoleId = config.moderation?.muteRole;

        // Fetch members (cache might not be enough)
        await message.guild.members.fetch();

        const mutedMembers = message.guild.members.cache.filter(m => {
            const isTimedOut = m.communicationDisabledUntilTimestamp > Date.now();
            const hasMuteRole = muteRoleId && m.roles.cache.has(muteRoleId);
            return isTimedOut || hasMuteRole;
        });

        if (mutedMembers.size === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('moderation.mutelist_title_list', message.guild.id), await t('moderation.mutelist_empty', message.guild.id), 'info')] });
        }

        const description = await Promise.all(mutedMembers.map(async m => {
            const isTimedOut = m.communicationDisabledUntilTimestamp > Date.now();
            const hasMuteRole = muteRoleId && m.roles.cache.has(muteRoleId);
            let reason = [];
            if (isTimedOut) reason.push(await t('moderation.mutelist_timeout', message.guild.id, { time: `<t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>` }));
            if (hasMuteRole) reason.push(await t('moderation.mutelist_role', message.guild.id));
            return `**${m.user.tag}** (${m.id})\n└ ${reason.join(' + ')}`;
        }));

        const embed = createEmbed(
            await t('moderation.mutelist_title', message.guild.id, { count: mutedMembers.size }),
            description.slice(0, 20).join('\n\n'),
            'primary'
        );
        
        if (mutedMembers.size > 20) {
            embed.setFooter({ text: await t('moderation.mutelist_footer', message.guild.id, { count: mutedMembers.size - 20 }) });
        }

        return replyMsg.edit({ embeds: [embed] });
    }
};
