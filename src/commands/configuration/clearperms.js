const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { sendV2Message, updateV2Interaction, editV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'clearperms',
    description: 'Supprime toutes les permissions personnalisées',
    category: 'Configuration',
    async execute(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Vous n'avez pas la permission (Administrator requis).", []);
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_clearperms').setLabel('Confirmer').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_clearperms').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
        );

        const content = "⚠️ **Voulez-vous supprimer TOUTES les permissions personnalisées de ce serveur ?**";
        const msg = await sendV2Message(client, message.channel.id, content, [row]);

        const filter = i => (i.customId === 'confirm_clearperms' || i.customId === 'cancel_clearperms') && i.user.id === message.author.id && i.message.id === msg.id;
        
        const channel = message.channel;

        try {
            const interaction = await channel.awaitMessageComponent({ filter, time: 15000 });
            
            if (interaction.customId === 'confirm_clearperms') {
                const config = await getGuildConfig(message.guild.id);
                config.customPermissions = [];
                await config.save();
                await updateV2Interaction(client, interaction, "✅ Toutes les permissions ont été supprimées.", []);
            } else {
                await updateV2Interaction(client, interaction, "❌ Annulé.", []);
            }
        } catch (e) {
            try {
                await editV2Message(client, channel.id, msg.id, "❌ Temps écoulé.", []);
            } catch (err) {}
        }
    }
};
