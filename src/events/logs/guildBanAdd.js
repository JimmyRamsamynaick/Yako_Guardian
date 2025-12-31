const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'guildBanAdd',
    async execute(client, ban) {
        const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        
        const description = `Le membre ${ban.user} (\`${ban.user.tag}\`) a été banni.`;
        
        sendLog(ban.guild, '🔨 Membre Banni', description, '#FF0000', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};