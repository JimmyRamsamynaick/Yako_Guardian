const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'roleCreate',
    async execute(client, role) {
        if (!role.guild) return;
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
        
        const description = await t('logs.descriptions.role_create', role.guild.id, { role: role, name: role.name });
        
        sendLog(role.guild, await t('logs.titles.role_create', role.guild.id), description, '#00FF00', [
            { name: await t('logs.fields.executed_by', role.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', role.guild.id) }
        ], executor);
    }
};
