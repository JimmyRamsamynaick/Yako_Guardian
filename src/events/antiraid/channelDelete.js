const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'channelDelete',
    async execute(client, channel) {
        if (!channel.guild) return;
        
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
        if (!executor) return;

        const member = await channel.guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        // Check Anti-Channel
        const isSanctioned = await checkAntiraid(client, channel.guild, member, 'antichannel');
        
        // Restore channel if sanctioned (Anti-Channel triggered)
        if (isSanctioned) {
            try {
                // Clone the channel to restore it with same properties and permissions
                // We explicitly pass position to try to maintain order
                await channel.clone({
                    name: channel.name,
                    position: channel.position,
                    reason: "Yako Guardian | Anti-Channel Restoration"
                });
            } catch (err) {
                console.error(`[Anti-Channel] Failed to restore channel ${channel.name}:`, err);
            }
        }
    }
};
