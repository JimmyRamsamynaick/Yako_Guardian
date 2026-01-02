const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'guildBanRemove',
    async execute(client, ban) {
        const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
        
        const description = await t('logs.descriptions.member_unban', ban.guild.id, { user: ban.user, tag: ban.user.tag });
        
        sendLog(ban.guild, await t('logs.titles.member_unban', ban.guild.id), description, '#00FF00', [
            { name: await t('logs.fields.executed_by', ban.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', ban.guild.id) }
        ], executor);
    }
};
