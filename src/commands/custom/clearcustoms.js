const CustomCommand = require('../../database/models/CustomCommand');
const { PermissionsBitField } = require('discord.js');
const { sendV2Message, updateV2Interaction } = require('../../utils/componentUtils');

module.exports = {
    name: 'clearcustoms',
    description: 'Supprime toutes les commandes personnalisées du serveur',
    category: 'Custom',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearcustoms').setLabel('Confirmer la suppression').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearcustoms').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
        );

        const content = "⚠️ **Êtes-vous sûr de vouloir supprimer TOUTES les commandes personnalisées ?**\nCette action est irréversible.";
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
                await updateV2Interaction(client, interaction, `✅ **${deleted.deletedCount}** commandes personnalisées ont été supprimées.`, []);
            } else {
                await updateV2Interaction(client, interaction, "❌ Suppression annulée.", []);
            }
        } catch (e) {
            // Edit message to remove components if timeout
            // We can't use msg.edit because msg is raw data.
            // We need to use editV2Message or client.rest.patch
            const { editV2Message } = require('../../utils/componentUtils');
            try {
                await editV2Message(client, channel.id, msgId, "❌ Temps écoulé, annulation.", []);
            } catch (err) { }
        }
    }
};
