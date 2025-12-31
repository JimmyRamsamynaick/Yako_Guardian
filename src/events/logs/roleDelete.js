const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'roleDelete',
    async execute(client, role) {
        if (!role.guild) return;
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
        
        const description = `Le rôle \`${role.name}\` a été supprimé.`;
        
        sendLog(role.guild, '🗑️ Rôle Supprimé', description, '#FF0000', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};