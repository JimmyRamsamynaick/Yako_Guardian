const { PermissionsBitField } = require('discord.js');
const { createEmbed, THEME } = require('../../utils/design');
const { t } = require('../../utils/i18n');
const { createPagination } = require('../../utils/pagination');

module.exports = {
    name: 'banlist',
    description: 'banlist.description',
    category: 'Moderation',
    usage: 'banlist.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.channel.send({ 
                embeds: [createEmbed(
                    await t('common.permission_missing_title', message.guild.id), 
                    await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), 
                    'error'
                )] 
            });
        }

        const loadingEmbed = createEmbed(
            await t('banlist.title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        try {
            const bans = await message.guild.bans.fetch();
            
            if (bans.size === 0) {
                return replyMsg.edit({ 
                    embeds: [createEmbed(
                        await t('banlist.title', message.guild.id), 
                        await t('banlist.empty', message.guild.id), 
                        'info'
                    )] 
                });
            }

            const banItems = Array.from(bans.values()).map(ban => ({
                user: ban.user.tag,
                id: ban.user.id,
                reason: ban.reason || 'Aucune raison fournie',
                // Discord API doesn't provide date directly in GuildBan, 
                // but we can try to extract it from audit logs if needed.
                // For simplicity and performance, we'll focus on user and reason.
                date: 'Inconnue' 
            }));

            // Remove loading message before showing pagination
            await replyMsg.delete().catch(() => {});

            await createPagination(
                client, 
                message, 
                banItems, 
                5, 
                await t('banlist.title', message.guild.id),
                async (item, index) => {
                    const line = await t('banlist.item', message.guild.id, {
                        index,
                        user: item.user,
                        id: item.id,
                        reason: item.reason,
                        date: item.date
                    });
                    return line;
                }
            );

        } catch (error) {
            console.error('Error fetching bans:', error);
            await replyMsg.edit({ 
                embeds: [createEmbed(
                    await t('common.error_title', message.guild.id), 
                    await t('common.error_generic', message.guild.id), 
                    'error'
                )] 
            });
        }
    }
};
