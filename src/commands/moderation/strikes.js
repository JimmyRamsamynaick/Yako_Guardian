const { PermissionsBitField } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'strikes',
    description: 'strikes.description',
    category: 'Moderation',
    aliases: ['warnings', 'warns'],
    usage: 'strikes.usage',
    async run(client, message, args) {
        let target;
        if (args[0]) {
            if (message.mentions.users.size > 0) target = message.mentions.users.first();
            else target = await client.users.fetch(args[0]).catch(() => null);
        } else {
            target = message.author;
        }

        if (!target) return message.channel.send({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('moderation.strikes_user_not_found', message.guild.id), 'error')] });
        
        // Permission check: You can view your own, but need Perms to view others
        if (target.id !== message.author.id && !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
             return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('moderation.strikes_view_self_only', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.strikes_title', message.guild.id), `${THEME.icons.loading} ${await t('moderation.strikes_loading', message.guild.id)}`, 'loading')] });

        const data = await UserStrike.findOne({ guildId: message.guild.id, userId: target.id });
        
        if (!data || !data.strikes || data.strikes.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed(await t('moderation.strikes_none_title', message.guild.id), await t('moderation.strikes_none', message.guild.id, { user: target.tag }), 'success')] });
        }

        const recent = data.strikes.slice(-10).reverse();
        
        let desc = `${THEME.separators.line}\n`;
        for (let i = 0; i < recent.length; i++) {
            const s = recent[i];
            const date = new Date(s.timestamp).toLocaleDateString();
            desc += await t('moderation.strikes_entry', message.guild.id, {
                index: data.strikes.length - i,
                date,
                reason: s.reason,
                type: s.type || 'warn'
            }) + "\n";
        }
        desc += `${THEME.separators.line}`;

        const embed = createEmbed(
            await t('moderation.strikes_embed_title', message.guild.id, { user: target.tag }),
            desc,
            'warning',
            { footer: await t('moderation.strikes_total', message.guild.id, { count: data.strikes.length }) }
        );
        embed.setThumbnail(target.displayAvatarURL());

        await replyMsg.edit({ embeds: [embed] });
    }
};
