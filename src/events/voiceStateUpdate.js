const TempVocConfig = require('../database/models/TempVocConfig');
const ActiveTempVoc = require('../database/models/ActiveTempVoc');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { t } = require('../utils/i18n');
const { buildTempVocPanel, refreshTempVocPanel } = require('../utils/tempVocPanel');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        // --- BLACKLIST & LOCK CHECK ---
        if (newState.channelId) {
            const active = await ActiveTempVoc.findOne({ channelId: newState.channelId });
            if (active && active.ownerId !== newState.member.id) {
                const canBypass = newState.member.user.bot ||
                    newState.member.id === newState.guild.ownerId ||
                    active.allowedUsers.includes(newState.member.id);

                if (!canBypass) {
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
                        const everyoneOverwrites = channel.permissionOverwrites.cache.get(newState.guild.id);
                        const isLockedByPerms = everyoneOverwrites?.deny.has(PermissionsBitField.Flags.Connect);
                        const isLockedByName = channel.name.startsWith('🔒');

                        if (isLockedByPerms || isLockedByName) {
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
        }

        // --- DELETE EMPTY TEMP CHANNELS & REMOVE PERMS ON LEAVE ---
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
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

                if (channel && channel.members.size > 0) {
                    await refreshTempVocPanel(channel, active);
                }
            }
        }

        // --- REFRESH PANEL ON JOIN (member count) ---
        if (newState.channelId && oldState.channelId !== newState.channelId) {
            const joinedActive = await ActiveTempVoc.findOne({ channelId: newState.channelId });
            if (joinedActive && newState.channel) {
                const config = await TempVocConfig.findOne({ guildId: newState.guild.id });
                if (!config || newState.channelId !== config.hubChannelId) {
                    await refreshTempVocPanel(newState.channel, joinedActive);
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

                    const active = await ActiveTempVoc.create({
                        guildId: newState.guild.id,
                        channelId: channel.id,
                        ownerId: newState.member.id
                    });

                    const panel = await buildTempVocPanel(channel, active, { mentionOwner: true });
                    const panelMessage = await channel.send({
                        content: `<@${newState.member.id}>`,
                        ...panel
                    });

                    active.panelMessageId = panelMessage.id;
                    await active.save();

                } catch (e) {
                    console.error("TempVoc Error:", e);
                }
            }
        }
    }
};
