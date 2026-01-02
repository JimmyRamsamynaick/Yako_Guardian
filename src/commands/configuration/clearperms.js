const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, editV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'clearperms',
    description: 'Supprime toutes les permissions personnalisées',
    category: 'Configuration',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('clearperms.permission', message.guild.id), []);
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearperms').setLabel(await t('clearperms.confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearperms').setLabel(await t('clearperms.cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const content = await t('clearperms.question', message.guild.id);
        const msg = await sendV2Message(client, message.channel.id, content, [row]);

        const filter = i => (i.customId === 'confirm_clearperms' || i.customId === 'cancel_clearperms') && i.user.id === message.author.id && i.message.id === msg.id;
        
        const channel = message.channel;

        try {
            const interaction = await channel.awaitMessageComponent({ filter, time: 15000 });
            
            if (interaction.customId === 'confirm_clearperms') {
                const config = await getGuildConfig(message.guild.id);
                config.customPermissions = [];
                await config.save();
                await updateV2Interaction(client, interaction, await t('clearperms.success', message.guild.id), []);
            } else {
                await updateV2Interaction(client, interaction, await t('clearperms.cancelled', message.guild.id), []);
            }
        } catch (e) {
            try {
                await editV2Message(client, channel.id, msg.id, await t('clearperms.timeout', message.guild.id), []);
            } catch (err) {}
        }
    }
};
