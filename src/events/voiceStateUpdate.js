const TempVocConfig = require('../database/models/TempVocConfig');
const ActiveTempVoc = require('../database/models/ActiveTempVoc');
const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendV2Message } = require('../utils/componentUtils');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        // --- BLACKLIST CHECK ---
        if (newState.channelId) {
            const active = await ActiveTempVoc.findOne({ channelId: newState.channelId });
            if (active && active.blockedUsers.includes(newState.member.id) && active.ownerId !== newState.member.id) {
                try {
                    await newState.disconnect("Blacklisted");
                } catch (e) {
                    // Ignore if already disconnected
                }
                return;
            }
        }

        // --- DELETE EMPTY TEMP CHANNELS ---
        if (oldState.channelId) {
            const active = await ActiveTempVoc.findOne({ channelId: oldState.channelId });
            if (active) {
                const channel = oldState.channel;
                if (channel && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        await ActiveTempVoc.deleteOne({ channelId: oldState.channelId });
                    } catch (e) {
                        console.error("Failed to delete temp channel:", e);
                    }
                }
            }
        }

        // --- CREATE NEW TEMP CHANNEL ---
        if (newState.channelId) {
            const config = await TempVocConfig.findOne({ guildId: newState.guild.id });
            if (config && newState.channelId === config.hubChannelId) {
                try {
                    const parent = newState.guild.channels.cache.get(config.categoryId);
                    const channelName = config.channelName.replace('{username}', newState.member.user.username);

                    const channel = await newState.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildVoice,
                        parent: parent ? parent.id : null,
                        permissionOverwrites: [
                            {
                                id: newState.member.id,
                                allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers],
                            },
                            {
                                id: client.user.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels],
                            },
                            {
                                id: newState.guild.id,
                                allow: [PermissionsBitField.Flags.Connect],
                            }
                        ],
                        userLimit: config.limit || 0
                    });

                    await newState.setChannel(channel);

                    await ActiveTempVoc.create({
                        guildId: newState.guild.id,
                        channelId: channel.id,
                        ownerId: newState.member.id
                    });

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tempvoc_lock').setEmoji('🔒').setLabel('Verrouiller').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_unlock').setEmoji('🔓').setLabel('Déverrouiller').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_hide').setEmoji('👁️').setLabel('Masquer/Visible').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_transfer').setEmoji('👑').setLabel('Transfert').setStyle(ButtonStyle.Primary)
                    );
                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tempvoc_limit').setEmoji('👥').setLabel('Limite').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_rename').setEmoji('✏️').setLabel('Renommer').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_kick').setEmoji('👢').setLabel('Kick').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('tempvoc_purge').setEmoji('💥').setLabel('Purge').setStyle(ButtonStyle.Danger)
                    );
                    const row3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tempvoc_wl').setEmoji('✅').setLabel('Whitelist').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('tempvoc_bl').setEmoji('⛔').setLabel('Blacklist').setStyle(ButtonStyle.Secondary)
                    );

                    await sendV2Message(client, channel.id, `👋 Bienvenue dans votre salon temporaire <@${newState.member.id}> !\nUtilisez les boutons ci-dessous pour gérer votre salon.`, [row1, row2, row3]);

                } catch (e) {
                    console.error("TempVoc Error:", e);
                }
            }
        }
    }
};
