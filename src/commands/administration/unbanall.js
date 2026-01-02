const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'unbanall',
    description: 'Débannir tous les utilisateurs',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(
                await t('unbanall.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unbanall_confirm').setLabel(await t('unbanall.btn_confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('unbanall_cancel').setLabel(await t('unbanall.btn_cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({
            embeds: [createEmbed(
                await t('unbanall.warning', message.guild.id),
                '',
                'warning'
            )],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: await t('unbanall.not_allowed', message.guild.id), ephemeral: true });
            }

            if (i.customId === 'unbanall_confirm') {
                await i.update({
                    embeds: [createEmbed(await t('unbanall.progress', message.guild.id), '', 'loading')],
                    components: []
                });
                
                try {
                    const bans = await message.guild.bans.fetch();
                    if (bans.size === 0) {
                        return i.editReply({
                            embeds: [createEmbed(await t('unbanall.no_bans', message.guild.id), '', 'info')]
                        });
                    }

                    let count = 0;
                    for (const [id, ban] of bans) {
                        await message.guild.members.unban(id);
                        count++;
                    }
                    await i.editReply({
                        embeds: [createEmbed(await t('unbanall.success', message.guild.id, { count: count }), '', 'success')]
                    });
                } catch (e) {
                    console.error(e);
                    await i.editReply({
                        embeds: [createEmbed(await t('unbanall.error', message.guild.id), '', 'error')]
                    });
                }
            } else {
                await i.update({
                    embeds: [createEmbed(await t('unbanall.cancelled', message.guild.id), '', 'error')],
                    components: []
                });
            }
        });
    }
};