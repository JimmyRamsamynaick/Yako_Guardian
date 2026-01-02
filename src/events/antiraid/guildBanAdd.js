const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'guildBanAdd',
    async execute(client, ban) {
        const guild = ban.guild;
        const executor = await getExecutor(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        if (!executor) return;

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        const triggered = await checkAntiraid(client, guild, member, 'antiban');
        if (triggered) {
            guild.members.unban(ban.user.id, await t('antiraid.reasons.anti_ban', guild.id)).catch(() => {});
        }
    }
};
