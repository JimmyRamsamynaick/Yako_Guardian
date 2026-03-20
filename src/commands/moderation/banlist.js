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
            await t('banlist_cmd.title', message.guild.id),
            `${THEME.icons.loading} ${await t('common.loading', message.guild.id)}`,
            'loading'
        );
        const replyMsg = await message.channel.send({ embeds: [loadingEmbed] });

        try {
            const bans = await message.guild.bans.fetch();
            
            if (bans.size === 0) {
                return replyMsg.edit({ 
                    embeds: [createEmbed(
                        await t('banlist_cmd.title', message.guild.id), 
                        await t('banlist_cmd.empty', message.guild.id), 
                        'info'
                    )] 
                });
            }

            const banItems = Array.from(bans.values()).map(ban => ({
                user: ban.user.tag,
                id: ban.user.id,
                reason: ban.reason || 'Aucune raison fournie',
                date: 'Inconnue' 
            }));

            // Supprimer le message de chargement avant d'afficher la pagination
            if (replyMsg.deletable) await replyMsg.delete().catch(() => {});

            const title = await t('banlist_cmd.title', message.guild.id);

            await createPagination(
                client, 
                message, 
                banItems, 
                5, 
                title,
                async (item, index) => {
                    const result = await t('banlist_cmd.item', message.guild.id, {
                        index: String(index),
                        user: String(item.user),
                        id: String(item.id),
                        reason: String(item.reason),
                        date: String(item.date)
                    });
                    return result;
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
