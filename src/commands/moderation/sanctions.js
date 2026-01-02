const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSanctions } = require('../../utils/moderation/sanctionUtils');
const { sendV2Message, updateV2Interaction } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'sanctions',
    description: 'Affiche les sanctions d\'un membre',
    category: 'Moderation',
    usage: 'sanctions <membre>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'ModerateMembers' }), []);
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const userId = targetMember ? targetMember.id : args[0];

        if (!userId) {
            return sendV2Message(client, message.channel.id, await t('moderation.user_not_found', message.guild.id), []);
        }

        const sanctions = await getSanctions(message.guild.id, userId);

        if (sanctions.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.sanctions_none', message.guild.id, { user: userId }), []);
        }

        // Pagination
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sanctions.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = async (page) => {
            const start = page * itemsPerPage;
            const currentSanctions = sanctions.slice(start, start + itemsPerPage);

            const embed = new EmbedBuilder()
                .setTitle(await t('moderation.sanctions_title', message.guild.id, { user: targetMember ? targetMember.user.tag : userId }))
                .setColor('#ff0000')
                .setThumbnail(targetMember ? targetMember.user.displayAvatarURL({ dynamic: true }) : null)
                .setFooter({ text: await t('moderation.sanctions_page_footer', message.guild.id, { current: page + 1, total: totalPages, count: sanctions.length }) });

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

        const msg = await message.channel.send({ embeds: [embed], components });

        if (totalPages > 1) {
            const collector = msg.createMessageComponentCollector({ time: 60000 });

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
