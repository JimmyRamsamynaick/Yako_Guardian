const { sendV2Message, replyV2Interaction, updateV2Interaction } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'renew',
    description: 'Recréer un salon à neuf (Nuke)',
    category: 'Administration',
    async run(client, message, args) {
        if (!message.member.permissions.has('ManageChannels') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('renew.permission', message.guild.id), []);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        if (!channel.isTextBased()) { // Can we renew voice? Yes.
             // Just clone it.
        }

        // Confirmation? User asked for confirmation buttons for critical actions.
        // Nuke is critical.
        
        // I should implement a confirmation flow.
        // But for speed in this tool call, I might skip or implement a simple one.
        // Given the instructions "Confirmations via boutons (Confirmer / Annuler)", I MUST implement it.
        
        // I need to use the componentHandler routing. 
        // Or I can send a message with buttons and use a collector (easier for single commands).
        // The user said "Interactions via components v2 type 17 uniquement".
        
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('renew_confirm').setLabel(await t('renew.btn_confirm', message.guild.id)).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('renew_cancel').setLabel(await t('renew.btn_cancel', message.guild.id)).setStyle(ButtonStyle.Secondary)
        );

        const msg = await sendV2Message(client, message.channel.id,
            await t('renew.warning', message.guild.id, { channel: channel }),
            [row]
        );

        const fetchedMsg = await message.channel.messages.fetch(msg.id);
        const collector = fetchedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return replyV2Interaction(client, i, await t('renew.not_allowed', message.guild.id), [], true);

            if (i.customId === 'renew_confirm') {
                try {
                    await replyV2Interaction(client, i, await t('renew.progress', message.guild.id), [], true);
                    const position = channel.position;
                    const newChannel = await channel.clone();
                    await channel.delete();
                    await newChannel.setPosition(position);
                    await sendV2Message(client, newChannel.id, await t('renew.success', message.guild.id, { user: message.author.toString() }), []);
                } catch (e) {
                    console.error(e);
                    // Use sendV2Message because original channel might be gone or interaction failed
                    // But if channel is gone, we can't send there.
                    // If channel delete failed, we can reply.
                    // Try reply first
                    try {
                        await replyV2Interaction(client, i, await t('renew.error', message.guild.id), [], true);
                    } catch (err) {}
                }
            } else {
                await updateV2Interaction(client, i, await t('renew.cancelled', message.guild.id), []);
            }
        });
    }
};