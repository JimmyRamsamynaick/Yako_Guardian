const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'channelCreate',
    async execute(client, channel) {
        if (!channel.guild) return;
        
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        if (!executor) return;

        const member = await channel.guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        // Check Anti-Channel
        const triggered = await checkAntiraid(client, channel.guild, member, 'antichannel');
        
        if (triggered) {
            channel.delete(await t('antiraid.reasons.anti_channel', channel.guild.id)).catch(() => {});
        }
    }
};
