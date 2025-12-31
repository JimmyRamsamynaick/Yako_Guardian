const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        let executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        if (!executor) executor = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        
        const changes = [];
        
        // Nickname
        if (oldMember.nickname !== newMember.nickname) {
            changes.push(`**Surnom:** \`${oldMember.nickname || oldMember.user.username}\` ➔ \`${newMember.nickname || newMember.user.username}\``);
        }
        
        // Roles
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        
        if (addedRoles.size > 0) changes.push(`**Rôles Ajoutés:** ${addedRoles.map(r => r).join(', ')}`);
        if (removedRoles.size > 0) changes.push(`**Rôles Retirés:** ${removedRoles.map(r => r).join(', ')}`);
        
        // Timeout
        if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
            changes.push(`**Timeout:** Jusqu'au <t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`);
        }
        if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
             changes.push(`**Timeout:** Retiré`);
        }

        if (changes.length === 0) return;

        const description = `Le membre ${newMember} a été mis à jour.\n\n${changes.join('\n')}`;
        
        sendLog(newMember.guild, '👤 Membre Modifié', description, '#0000FF', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};