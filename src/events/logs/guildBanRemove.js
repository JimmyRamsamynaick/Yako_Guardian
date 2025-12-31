const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'guildBanRemove',
    async execute(client, ban) {
        const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
        
        const description = `Le membre ${ban.user} (\`${ban.user.tag}\`) a été débanni.`;
        
        sendLog(ban.guild, '🔓 Membre Débanni', description, '#00FF00', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};