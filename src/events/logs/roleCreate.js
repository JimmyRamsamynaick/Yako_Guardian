const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'roleCreate',
    async execute(client, role) {
        if (!role.guild) return;
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
        
        const description = `Le rôle ${role} (\`${role.name}\`) a été créé.`;
        
        sendLog(role.guild, '🛡️ Rôle Créé', description, '#00FF00', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};