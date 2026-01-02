const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSanctions } = require('../../utils/moderation/sanctionUtils');
const { createEmbed, THEME } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'sanctions',
    description: 'Affiche les sanctions d\'un membre',
    category: 'Moderation',
    usage: 'sanctions <membre>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), 'error')] });
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const userId = targetMember ? targetMember.id : args[0];

        if (!userId) {
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('moderation.user_not_found', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Sanctions', `${THEME.icons.loading} Récupération de l'historique...`, 'loading')] });

        const sanctions = await getSanctions(message.guild.id, userId);

        if (sanctions.length === 0) {
            return replyMsg.edit({ embeds: [createEmbed('Historique Vierge', await t('moderation.sanctions_none', message.guild.id, { user: userId }), 'success')] });
        }

        // Pagination
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sanctions.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = async (page) => {
            const start = page * itemsPerPage;
            const currentSanctions = sanctions.slice(start, start + itemsPerPage);

            const embed = createEmbed(
                await t('moderation.sanctions_title', message.guild.id, { user: targetMember ? targetMember.user.tag : userId }),
                `${THEME.separators.line}\n**Total:** ${sanctions.length} sanction(s)\n${THEME.separators.line}`,
                'primary',
                { footer: await t('moderation.sanctions_page_footer', message.guild.id, { current: page + 1, total: totalPages, count: sanctions.length }) }
            );

            if (targetMember) {
                embed.setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }));
            }

            for (const s of currentSanctions) {
                const moderator = await client.users.fetch(s.moderatorId).catch(() => null);
                const modName = moderator ? moderator.tag : s.moderatorId;
                const date = new Date(s.timestamp).toLocaleDateString();
                const typeEmoji = {
                    'warn': '⚠️',
                    'mute': '🔇',
                    'tempmute': '🔇',
                    'kick': '👢',
                    'ban': '🔨',
                    'tempban': '🔨'
                }[s.type] || '❓';

                embed.addFields({
                    name: await t('moderation.sanctions_field_name', message.guild.id, { emoji: typeEmoji, caseId: s.caseId, type: s.type.toUpperCase() }),
                    value: await t('moderation.sanctions_field_value', message.guild.id, { reason: s.reason, moderator: modName, date: date, duration: s.duration ? `\n**Durée:** ${require('ms')(s.duration)}` : '' })
                });
            }

            return embed;
        };

        const embed = await generateEmbed(currentPage);
        const components = [];

        if (totalPages > 1) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev_page').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next_page').setLabel('▶️').setStyle(ButtonStyle.Primary)
                );
            components.push(row);
        }

        await replyMsg.edit({ embeds: [embed], components });

        if (totalPages > 1) {
            const collector = replyMsg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: await t('moderation.sanctions_button_error', message.guild.id), ephemeral: true });
                }

                if (i.customId === 'prev_page') currentPage--;
                if (i.customId === 'next_page') currentPage++;

                const newEmbed = await generateEmbed(currentPage);
                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('prev_page').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                        new ButtonBuilder().setCustomId('next_page').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1)
                    );

                await i.update({ embeds: [newEmbed], components: [newRow] });
            });
        }
    }
};
