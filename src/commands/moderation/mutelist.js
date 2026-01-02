const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'mutelist',
    description: 'Affiche la liste des membres mute (Timeout ou Rôle)',
    category: 'Moderation',
    usage: 'mutelist',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

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
            return sendV2Message(client, message.channel.id, await t('moderation.mutelist_empty', message.guild.id), []);
        }

        const embed = new EmbedBuilder()
            .setTitle(await t('moderation.mutelist_title', message.guild.id, { count: mutedMembers.size }))
            .setColor('#ff9900')
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        const description = await Promise.all(mutedMembers.map(async m => {
            const isTimedOut = m.communicationDisabledUntilTimestamp > Date.now();
            const hasMuteRole = muteRoleId && m.roles.cache.has(muteRoleId);
            let reason = [];
            if (isTimedOut) reason.push(await t('moderation.mutelist_timeout', message.guild.id, { time: `<t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>` }));
            if (hasMuteRole) reason.push(await t('moderation.mutelist_role', message.guild.id));
            return `**${m.user.tag}** (${m.id})\n└ ${reason.join(' + ')}`;
        }));

        embed.setDescription(description.slice(0, 20).join('\n\n'));
        
        if (mutedMembers.size > 20) {
            embed.setFooter({ text: await t('moderation.mutelist_footer', message.guild.id, { count: mutedMembers.size - 20 }) });
        }

        return message.channel.send({ embeds: [embed] });
    }
};
