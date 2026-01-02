const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { sendV2Message, updateV2Interaction, editV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'clearcustoms',
    description: 'Supprime toutes les commandes personnalisées du serveur',
    category: 'Custom',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('clearcustoms.permission', message.guild.id), []);
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearcustoms').setLabel(await t('clearcustoms.btn_confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearcustoms').setLabel(await t('clearcustoms.btn_cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const content = await t('clearcustoms.warning', message.guild.id);
        const msg = await sendV2Message(client, message.channel.id, content, [row]);

        // Since sendV2Message returns the message object (from client.rest.post usually returns raw data or message structure depending on djs version/usage)
        // client.rest.post returns the raw API response. We need to fetch the message object if we want to create a collector on it?
        // Actually, djs collectors work on channels or messages.
        // We can create a component collector on the channel with filter on message ID.
        
        // Wait, sendV2Message returns the raw API response object. It has an id.
        const msgId = msg.id;
        const channel = message.channel;

        const filter = i => (i.customId === 'confirm_clearcustoms' || i.customId === 'cancel_clearcustoms') && i.user.id === message.author.id && i.message.id === msgId;
        
        try {
            const interaction = await channel.awaitMessageComponent({ filter, time: 15000 });
            
            if (interaction.customId === 'confirm_clearcustoms') {
                const deleted = await CustomCommand.deleteMany({ guildId: message.guild.id });
                await updateV2Interaction(client, interaction, await t('clearcustoms.success', message.guild.id, { count: deleted.deletedCount }), []);
            } else {
                await updateV2Interaction(client, interaction, await t('clearcustoms.cancelled', message.guild.id), []);
            }
        } catch (e) {
            // Edit message to remove components if timeout
            // We can't use msg.edit because msg is raw data.
            // We need to use editV2Message or client.rest.patch
            try {
                await editV2Message(client, channel.id, msgId, await t('clearcustoms.timeout', message.guild.id), []);
            } catch (err) { }
        }
    }
};
