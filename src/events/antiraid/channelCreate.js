const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');
const { getGuildConfig } = require('../../utils/mongoUtils');

module.exports = {
    name: 'channelCreate',
    async execute(client, channel) {
        if (!channel.guild) return;
        
        // --- 1. Anti-Raid Checks ---
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        if (executor) {
            const member = await channel.guild.members.fetch(executor.id).catch(() => null);
            if (member) {
                // Check Anti-Channel
                const triggered = await checkAntiraid(client, channel.guild, member, 'antichannel');
                
                if (triggered) {
                    channel.delete(await t('antiraid.reasons.anti_channel', channel.guild.id)).catch(() => {});
                    return; // Channel deleted, stop
                }
            }
        }

        // --- 2. Captcha Isolation Enforcement ---
        try {
            const config = await getGuildConfig(channel.guild.id);
            if (config?.security?.captcha?.isolationEnabled && config?.security?.captcha?.unverifiedRoleId) {
                const unverifiedRole = channel.guild.roles.cache.get(config.security.captcha.unverifiedRoleId);
                if (unverifiedRole) {
                    // Check if channel already has effective denial (e.g. from category sync)
                    // We check permissionsFor to see the RESULT, but here we want to ensure the OVERWRITE exists if needed.
                    // But actually, just checking if the role has permission in the channel is enough.
                    const permissions = channel.permissionsFor(unverifiedRole);
                    if (permissions.has('ViewChannel')) {
                        // If they can see it, we must block it.
                        // But wait, permissionsFor returns the computed permissions.
                        // If unverifiedRole has ViewChannel=false in category, permissions.has('ViewChannel') should be false.
                        
                        // Let's explicitly check overwrites to avoid race conditions or cache issues
                        // and ensure we enforce it.
                        
                        await channel.permissionOverwrites.edit(unverifiedRole, {
                            ViewChannel: false,
                            SendMessages: false,
                            Connect: false
                        }, { reason: 'Captcha Isolation Auto-Enforcement' }).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to enforce isolation on new channel ${channel.id}:`, e);
        }
    }
};
