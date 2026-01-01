const { getGuildConfig } = require('../utils/mongoUtils');

module.exports = {
    name: 'presenceUpdate',
    async execute(client, oldPresence, newPresence) {
        if (!newPresence || !newPresence.guild) return;

        const guild = newPresence.guild;
        const member = newPresence.member;

        if (!member) return;

        const config = await getGuildConfig(guild.id);
        if (!config.soutien || !config.soutien.enabled || !config.soutien.roleId || !config.soutien.statusText) return;

        const role = guild.roles.cache.get(config.soutien.roleId);
        if (!role) return;

        const statusText = config.soutien.statusText.toLowerCase();
        
        // Check activities
        const hasStatus = newPresence.activities.some(activity => 
            (activity.state && activity.state.toLowerCase().includes(statusText)) ||
            (activity.name && activity.name.toLowerCase().includes(statusText))
        );

        try {
            if (hasStatus) {
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                    // Optional: Log or DM
                }
            } else {
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                }
            }
        } catch (e) {
            // Ignore permission errors silently for now
            // console.error(`Failed to update soutien role in ${guild.name}:`, e);
        }
    }
};
