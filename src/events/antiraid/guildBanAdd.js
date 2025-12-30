const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'guildBanAdd',
    async execute(client, ban) {
        const guild = ban.guild;
        const executor = await getExecutor(guild, AuditLogEvent.MemberBanAdd);
        if (!executor) return;

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        const triggered = await checkAntiraid(client, guild, member, 'antiban');
        if (triggered) {
            guild.members.unban(ban.user.id, 'Yako Guardian | Anti-Ban Sanction').catch(() => {});
        }
    }
};
