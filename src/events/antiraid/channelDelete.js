const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'channelDelete',
    async execute(client, channel) {
        if (!channel.guild) return;
        
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);
        if (!executor) return;

        const member = await channel.guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        // Check Anti-Channel
        await checkAntiraid(client, channel.guild, member, 'antichannel');
        
        // Cannot restore channel easily without backup, but we sanctioned the user.
    }
};
