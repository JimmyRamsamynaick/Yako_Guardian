const { sendV2Message, updateV2Interaction, replyV2Interaction } = require('../../utils/componentUtils');

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

        const msg = await sendV2Message(client, message.channel.id, 
            `⚠️ **ATTENTION** : Vous allez débannir TOUS les membres bannis.\nCette action est irréversible et peut être longue.\nConfirmez-vous ?`, 
            [row]
        );

        // Note: sendV2Message returns a raw message object, not a DJS Message object with createMessageComponentCollector
        // We need to fetch the message as a DJS object or use the interaction handler.
        // However, for this specific command which uses a collector, it's better to stick to DJS channel.send if we need the collector on the message.
        // BUT, we must use V2 components.
        // Problem: DJS v14 Message object doesn't support V2 components natively in channel.send if we want to use the collector on it easily?
        // Actually, sendV2Message uses REST. We can fetch the message via channel.messages.fetch(msg.id).
        
        const fetchedMsg = await message.channel.messages.fetch(msg.id);
        const collector = fetchedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return replyV2Interaction(client, i, "❌ Pas touche !", [], true);

            if (i.customId === 'unbanall_confirm') {
                await updateV2Interaction(client, i, "⏳ Débannissement en cours... Patientez.", []);
                
                try {
                    const bans = await message.guild.bans.fetch();
                    if (bans.size === 0) return updateV2Interaction(client, i, "✅ Aucun membre banni.", []);

                    let count = 0;
                    for (const [id, ban] of bans) {
                        await message.guild.members.unban(id);
                        count++;
                    }
                    await updateV2Interaction(client, i, `✅ **${count}** membres ont été débannis.`, []);
                } catch (e) {
                    console.error(e);
                    await updateV2Interaction(client, i, "❌ Une erreur est survenue.", []);
                }
            } else {
                await updateV2Interaction(client, i, "❌ Action annulée.", []);
            }
        });
    }
};