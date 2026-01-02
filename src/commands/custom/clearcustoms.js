const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'clearcustoms',
    description: 'Supprime toutes les commandes personnalisées du serveur',
    category: 'Custom',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('clearcustoms.permission', message.guild.id), '', 'error')] });
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearcustoms').setLabel(await t('clearcustoms.btn_confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearcustoms').setLabel(await t('clearcustoms.btn_cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const content = await t('clearcustoms.warning', message.guild.id);
        const msg = await message.channel.send({ 
            embeds: [createEmbed(content, '', 'warning')], 
            components: [row] 
        });

        const filter = i => (i.customId === 'confirm_clearcustoms' || i.customId === 'cancel_clearcustoms') && i.user.id === message.author.id && i.message.id === msg.id;
        
        try {
            const interaction = await message.channel.awaitMessageComponent({ filter, time: 15000 });
            
            if (interaction.customId === 'confirm_clearcustoms') {
                const deleted = await CustomCommand.deleteMany({ guildId: message.guild.id });
                await interaction.update({ 
                    embeds: [createEmbed(await t('clearcustoms.success', message.guild.id, { count: deleted.deletedCount }), '', 'success')], 
                    components: [] 
                });
            } else {
                await interaction.update({ 
                    embeds: [createEmbed(await t('clearcustoms.cancelled', message.guild.id), '', 'info')], 
                    components: [] 
                });
            }
        } catch (e) {
            try {
                if (msg.editable) {
                    await msg.edit({ 
                        embeds: [createEmbed(await t('clearcustoms.timeout', message.guild.id), '', 'warning')], 
                        components: [] 
                    });
                }
            } catch (err) { }
        }
    }
};
