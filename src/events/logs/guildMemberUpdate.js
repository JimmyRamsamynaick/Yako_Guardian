const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        let executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        if (!executor) executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        
        const changes = [];
        
        // Nickname
        if (oldMember.nickname !== newMember.nickname) {
            changes.push(await t('logs.changes.nickname', newMember.guild.id, { 
                old: oldMember.nickname || oldMember.user.username, 
                new: newMember.nickname || newMember.user.username 
            }));
        }
        
        // Roles
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        
        if (addedRoles.size > 0) changes.push(await t('logs.changes.roles_added', newMember.guild.id, { roles: addedRoles.map(r => r).join(', ') }));
        if (removedRoles.size > 0) changes.push(await t('logs.changes.roles_removed', newMember.guild.id, { roles: removedRoles.map(r => r).join(', ') }));
        
        // Timeout
        if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
            changes.push(await t('logs.changes.timeout_active', newMember.guild.id, { time: Math.floor(newMember.communicationDisabledUntilTimestamp / 1000) }));
        }
        if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
             changes.push(await t('logs.changes.timeout_removed', newMember.guild.id));
        }

        if (changes.length === 0) return;

        const description = await t('logs.descriptions.member_update', newMember.guild.id, { member: newMember, changes: changes.join('\n') });
        
        sendLog(newMember.guild, await t('logs.titles.member_update', newMember.guild.id), description, '#0000FF', [
            { name: await t('logs.fields.executed_by', newMember.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', newMember.guild.id) }
        ], executor);
    }
};
