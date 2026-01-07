const { getGuildConfig } = require('../utils/mongoUtils');
const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presenceUpdate',
    async execute(client, oldPresence, newPresence) {
        if (!newPresence || !newPresence.guild) return;

        const guild = newPresence.guild;
        const member = newPresence.member;

        if (!member) return;

        const config = await getGuildConfig(guild.id);

        // --- Soutien Handler ---
        if (config.soutien && config.soutien.enabled && config.soutien.roleId && config.soutien.statusText) {
            const role = guild.roles.cache.get(config.soutien.roleId);
            if (role) {
                const statusText = config.soutien.statusText.toLowerCase();
                const hasStatus = newPresence.activities.some(activity => 
                    (activity.state && activity.state.toLowerCase().includes(statusText)) ||
                    (activity.name && activity.name.toLowerCase().includes(statusText))
                );

                try {
                    if (hasStatus) {
                        if (!member.roles.cache.has(role.id)) {
                            await member.roles.add(role);
                        }
                    } else {
                        if (member.roles.cache.has(role.id)) {
                            await member.roles.remove(role);
                        }
                    }
                } catch (e) {
                    // Ignore permission errors
                }
            }
        }

        // --- Twitch Live Role Handler ---
        if (config.twitch && config.twitch.enabled && config.twitch.liveRoleId) {
            const liveRole = guild.roles.cache.get(config.twitch.liveRoleId);
            
            if (liveRole) {
                // Check if streamer role is required
                if (config.twitch.streamerRoleId) {
                    const hasStreamerRole = member.roles.cache.has(config.twitch.streamerRoleId);
                    if (!hasStreamerRole) {
                        // If user doesn't have the required streamer role, ensure they don't have the live role
                        if (member.roles.cache.has(liveRole.id)) {
                            try {
                                await member.roles.remove(liveRole);
                            } catch (e) {}
                        }
                        return; // Stop processing for this user
                    }
                }

                const isStreaming = newPresence.activities.some(activity => 
                    activity.type === ActivityType.Streaming
                );

                try {
                    if (isStreaming) {
                        if (!member.roles.cache.has(liveRole.id)) {
                            await member.roles.add(liveRole);
                        }
                    } else {
                        if (member.roles.cache.has(liveRole.id)) {
                            await member.roles.remove(liveRole);
                        }
                    }
                } catch (e) {
                    // Ignore permission errors
                }
            }
        }
    }
};
