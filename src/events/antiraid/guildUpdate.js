const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'guildUpdate',
    async execute(client, oldGuild, newGuild) {
        const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate);
        if (!executor) return;

        const member = await newGuild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        const triggered = await checkAntiraid(client, newGuild, member, 'antiupdate');
        
        if (triggered) {
            // Revert changes (Basic implementation: Name and Icon)
            if (oldGuild.name !== newGuild.name) {
                await newGuild.setName(oldGuild.name).catch(() => {});
            }
            if (oldGuild.icon !== newGuild.icon) {
                await newGuild.setIcon(oldGuild.icon).catch(() => {});
            }
        }
    }
};
