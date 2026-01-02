const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'roleUpdate',
    async execute(client, oldRole, newRole) {
        if (!newRole.guild) return;
        if (oldRole.rawPosition !== newRole.rawPosition) return;

        const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
        
        const changes = [];
        if (oldRole.name !== newRole.name) changes.push(await t('logs.changes.name', newRole.guild.id, { old: oldRole.name, new: newRole.name }));
        if (oldRole.color !== newRole.color) changes.push(await t('logs.changes.color', newRole.guild.id, { old: oldRole.hexColor, new: newRole.hexColor }));
        if (oldRole.hoist !== newRole.hoist) changes.push(await t('logs.changes.hoist', newRole.guild.id, { old: oldRole.hoist, new: newRole.hoist }));
        if (oldRole.mentionable !== newRole.mentionable) changes.push(await t('logs.changes.mentionable', newRole.guild.id, { old: oldRole.mentionable, new: newRole.mentionable }));
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(await t('logs.changes.permissions', newRole.guild.id));

        if (changes.length === 0) return;

        const description = await t('logs.descriptions.role_update', newRole.guild.id, { role: newRole, changes: changes.join('\n') });
        
        sendLog(newRole.guild, await t('logs.titles.role_update', newRole.guild.id), description, '#FFA500', [
            { name: await t('logs.fields.executed_by', newRole.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', newRole.guild.id) }
        ], executor);
    }
};
