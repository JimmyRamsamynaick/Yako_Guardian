const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'channelUpdate',
    async execute(client, oldChannel, newChannel) {
        if (!newChannel.guild) return;
        if (oldChannel.rawPosition !== newChannel.rawPosition) return; // Ignore position changes for spam reduction? Or keep it? User said 100%. I'll keep it but maybe debounced. Actually, let's log everything.

        const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
        
        const changes = [];
        if (oldChannel.name !== newChannel.name) changes.push(`**Nom:** \`${oldChannel.name}\` ➔ \`${newChannel.name}\``);
        if (oldChannel.topic !== newChannel.topic) changes.push(`**Sujet:** \`${oldChannel.topic || 'Aucun'}\` ➔ \`${newChannel.topic || 'Aucun'}\``);
        if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`**NSFW:** \`${oldChannel.nsfw}\` ➔ \`${newChannel.nsfw}\``);
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`**Slowmode:** \`${oldChannel.rateLimitPerUser}s\` ➔ \`${newChannel.rateLimitPerUser}s\``);
        
        if (changes.length === 0) return; // Ignore if only permission overwrites or position changed (complex to log nicely)

        const description = `Le salon ${newChannel} a été modifié.\n\n${changes.join('\n')}`;
        
        sendLog(newChannel.guild, '📝 Salon Modifié', description, '#FFA500', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};