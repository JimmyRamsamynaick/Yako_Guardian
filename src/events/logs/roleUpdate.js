const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'roleUpdate',
    async execute(client, oldRole, newRole) {
        if (!newRole.guild) return;
        if (oldRole.rawPosition !== newRole.rawPosition) return;

        const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
        
        const changes = [];
        if (oldRole.name !== newRole.name) changes.push(`**Nom:** \`${oldRole.name}\` ➔ \`${newRole.name}\``);
        if (oldRole.color !== newRole.color) changes.push(`**Couleur:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
        if (oldRole.hoist !== newRole.hoist) changes.push(`**Affiché séparément:** \`${oldRole.hoist}\` ➔ \`${newRole.hoist}\``);
        if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionnable:** \`${oldRole.mentionable}\` ➔ \`${newRole.mentionable}\``);
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`**Permissions modifiées**`);

        if (changes.length === 0) return;

        const description = `Le rôle ${newRole} a été modifié.\n\n${changes.join('\n')}`;
        
        sendLog(newRole.guild, '📝 Rôle Modifié', description, '#FFA500', [
            { name: 'Exécuté par', value: executor ? `${executor.tag} (\`${executor.id}\`)` : 'Inconnu' }
        ], executor);
    }
};