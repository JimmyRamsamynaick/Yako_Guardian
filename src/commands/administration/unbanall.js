const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unbanall',
    description: 'Débannir tous les utilisateurs',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unbanall_confirm').setLabel('Confirmer UNBAN ALL').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('unbanall_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({ 
            content: `⚠️ **ATTENTION** : Vous allez débannir TOUS les membres bannis.\nCette action est irréversible et peut être longue.\nConfirmez-vous ?`, 
            components: [row] 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: "❌ Pas touche !", ephemeral: true });

            if (i.customId === 'unbanall_confirm') {
                await i.update({ content: "⏳ Débannissement en cours... Patientez.", components: [] });
                
                try {
                    const bans = await message.guild.bans.fetch();
                    if (bans.size === 0) return i.followUp({ content: "✅ Aucun membre banni.", ephemeral: true });

                    let count = 0;
                    for (const [id, ban] of bans) {
                        await message.guild.members.unban(id);
                        count++;
                    }
                    await i.followUp({ content: `✅ **${count}** membres ont été débannis.` });
                } catch (e) {
                    console.error(e);
                    await i.followUp({ content: "❌ Une erreur est survenue.", ephemeral: true });
                }
            } else {
                await i.update({ content: "❌ Action annulée.", components: [] });
            }
        });
    }
};