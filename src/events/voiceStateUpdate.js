const TempVocConfig = require('../database/models/TempVocConfig');
const ActiveTempVoc = require('../database/models/ActiveTempVoc');
const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        // --- BLACKLIST & LOCK CHECK ---
        if (newState.channelId) {
            const active = await ActiveTempVoc.findOne({ channelId: newState.channelId });
            if (active && active.ownerId !== newState.member.id) {
                // 0. BOT & WHITELIST BYPASS
                // If it's a bot or in the tempvoc whitelist, they can stay
                if (newState.member.user.bot || active.allowedUsers.includes(newState.member.id)) {
                    return;
                }

                // 1. Blacklist check
                if (active.blockedUsers.includes(newState.member.id)) {
                    try {
                        await newState.disconnect(await t('tempvoc.blacklisted', newState.guild.id));
                    } catch (e) {}
                    return;
                }

                // 2. Lock check
                const channel = newState.channel;
                if (channel) {
                    // Check if channel name starts with the lock emoji OR if Connect is denied for everyone
                    const everyoneOverwrites = channel.permissionOverwrites.cache.get(newState.guild.id);
                    const isLockedByPerms = everyoneOverwrites?.deny.has(PermissionsBitField.Flags.Connect);
                    const isLockedByName = channel.name.startsWith('🔒');
                    
                    if ((isLockedByPerms || isLockedByName) && !active.allowedUsers.includes(newState.member.id)) {
                        // If they were already granted perms (SendMessages etc.), they can join.
                        // But if they just left, we should have removed it.
                        // Let's explicitly check if they have a specific Connect: true overwrite
                        const memberOverwrites = channel.permissionOverwrites.cache.get(newState.member.id);
                        const hasExplicitConnect = memberOverwrites?.allow.has(PermissionsBitField.Flags.Connect);

                        if (!hasExplicitConnect) {
                            try {
                                await newState.disconnect();
                            } catch (e) {}
                            return;
                        }
                    }
                }
            }
        }

        // --- DELETE EMPTY TEMP CHANNELS & REMOVE PERMS ON LEAVE ---
        if (oldState.channelId) {
            const active = await ActiveTempVoc.findOne({ channelId: oldState.channelId });
            if (active) {
                const channel = oldState.channel;
                if (channel && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        await ActiveTempVoc.deleteOne({ channelId: oldState.channelId });
                        return; // Exit if channel deleted
                    } catch (e) {
                        console.error("Failed to delete temp channel:", e);
                    }
                }

                // Cleanup: remove all personal overwrites when leaving a locked channel
                // unless they are the owner or whitelisted
                if (channel && active.ownerId !== oldState.member.id && !active.allowedUsers.includes(oldState.member.id)) {
                    const everyoneOverwrites = channel.permissionOverwrites.cache.get(oldState.guild.id);
                    const isLocked = everyoneOverwrites?.deny.has(PermissionsBitField.Flags.Connect);
                    
                    if (isLocked) {
                        // More aggressive cleanup: delete any specific overwrites for this member
                        // This removes the temporary SendMessages/ViewChannel perms granted during locking
                        await channel.permissionOverwrites.delete(oldState.member.id).catch(() => {});
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
                        new ButtonBuilder().setCustomId('tempvoc_lock').setEmoji('🔒').setLabel(await t('tempvoc.lock', newState.guild.id)).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_unlock').setEmoji('🔓').setLabel(await t('tempvoc.unlock', newState.guild.id)).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_hide').setEmoji('👁️').setLabel(await t('tempvoc.hide', newState.guild.id)).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_transfer').setEmoji('👑').setLabel(await t('tempvoc.transfer', newState.guild.id)).setStyle(ButtonStyle.Primary)
                    );
                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tempvoc_limit').setEmoji('👥').setLabel(await t('tempvoc.limit', newState.guild.id)).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_rename').setEmoji('✏️').setLabel(await t('tempvoc.rename', newState.guild.id)).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tempvoc_kick').setEmoji('👢').setLabel(await t('tempvoc.kick', newState.guild.id)).setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('tempvoc_purge').setEmoji('💥').setLabel(await t('tempvoc.purge', newState.guild.id)).setStyle(ButtonStyle.Danger)
                    );
                    const row3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tempvoc_wl').setEmoji('✅').setLabel(await t('tempvoc.whitelist', newState.guild.id)).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('tempvoc_bl').setEmoji('⛔').setLabel(await t('tempvoc.blacklist', newState.guild.id)).setStyle(ButtonStyle.Secondary)
                    );

                    await channel.send({ 
                        content: `<@${newState.member.id}>`,
                        embeds: [createEmbed(await t('tempvoc.panel_title', newState.guild.id), await t('tempvoc.welcome', newState.guild.id, { user: newState.member.id }), 'default')], 
                        components: [row1, row2, row3] 
                    });

                } catch (e) {
                    console.error("TempVoc Error:", e);
                }
            }
        }
    }
};
