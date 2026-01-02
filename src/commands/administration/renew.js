const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'renew',
    description: 'Recréer un salon à neuf (Nuke)',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(
                await t('renew.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        if (!channel.isTextBased()) { // Can we renew voice? Yes.
             // Just clone it.
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('renew_confirm').setLabel(await t('renew.btn_confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('renew_cancel').setLabel(await t('renew.btn_cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({
            embeds: [createEmbed(
                await t('renew.warning', message.guild.id, { channel: channel }),
                '',
                'warning'
            )],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: await t('renew.not_allowed', message.guild.id), ephemeral: true });
            }

            if (i.customId === 'renew_confirm') {
                try {
                    await i.update({
                        embeds: [createEmbed(await t('renew.progress', message.guild.id), '', 'loading')],
                        components: []
                    });
                    const position = channel.position;
                    const newChannel = await channel.clone();
                    await channel.delete();
                    await newChannel.setPosition(position);
                    await newChannel.send({ embeds: [createEmbed(
                        await t('renew.success', message.guild.id, { user: message.author.toString() }),
                        '',
                        'success'
                    )] });
                } catch (e) {
                    console.error(e);
                    try {
                        await i.editReply({
                            embeds: [createEmbed(await t('renew.error', message.guild.id), '', 'error')],
                            components: []
                        });
                    } catch (err) {}
                }
            } else {
                await i.update({
                    embeds: [createEmbed(await t('renew.cancelled', message.guild.id), '', 'error')],
                    components: []
                });
            }
        });
    }
};