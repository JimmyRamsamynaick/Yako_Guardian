const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'roleDelete',
    async execute(client, role) {
        if (!role.guild) return;
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
        
        const description = await t('logs.descriptions.role_delete', role.guild.id, { name: role.name });
        
        sendLog(role.guild, await t('logs.titles.role_delete', role.guild.id), description, '#FF0000', [
            { name: await t('logs.fields.executed_by', role.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', role.guild.id) }
        ], executor);
    }
};
