const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'clearperms',
    description: 'Supprime toutes les permissions personnalisées',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('clearperms.permission', message.guild.id),
                '',
                'error'
            )] });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearperms').setLabel(await t('clearperms.confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearperms').setLabel(await t('clearperms.cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const content = await t('clearperms.question', message.guild.id);
        const msg = await message.channel.send({ 
            embeds: [createEmbed(content, '', 'warning')], 
            components: [row] 
        });

        const filter = i => (i.customId === 'confirm_clearperms' || i.customId === 'cancel_clearperms') && i.user.id === message.author.id && i.message.id === msg.id;
        
        const channel = message.channel;

        try {
            const interaction = await channel.awaitMessageComponent({ filter, time: 15000 });
            
            if (interaction.customId === 'confirm_clearperms') {
                const config = await getGuildConfig(message.guild.id);
                config.customPermissions = [];
                await config.save();
                await interaction.update({ 
                    embeds: [createEmbed(await t('clearperms.success', message.guild.id), '', 'success')], 
                    components: [] 
                });
            } else {
                await interaction.update({ 
                    embeds: [createEmbed(await t('clearperms.cancelled', message.guild.id), '', 'info')], 
                    components: [] 
                });
            }
        } catch (e) {
            try {
                await msg.edit({ 
                    embeds: [createEmbed(await t('clearperms.timeout', message.guild.id), '', 'info')], 
                    components: [] 
                });
            } catch (err) {}
        }
    }
};
