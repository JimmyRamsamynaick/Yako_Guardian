const { sendLog } = require('../../utils/logManager');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'userUpdate',
    async execute(client, oldUser, newUser) {
        // Fetch full user if partial
        try {
            if (oldUser.partial) await oldUser.fetch();
            if (newUser.partial) await newUser.fetch();
        } catch (e) {
            return;
        }

        const changes = [];
        if (oldUser.username !== newUser.username) changes.push(await t('logs.changes.username', null, { old: oldUser.username, new: newUser.username })); // Global event, no guild ID initially
        if (oldUser.discriminator !== newUser.discriminator) changes.push(await t('logs.changes.discriminator', null, { old: oldUser.discriminator, new: newUser.discriminator }));
        if (oldUser.avatar !== newUser.avatar) changes.push(await t('logs.changes.avatar', null, { old: oldUser.displayAvatarURL(), new: newUser.displayAvatarURL() }));

        if (changes.length === 0) return;

        // Broadcast to all guilds where the user is present and logs are enabled
        // We iterate because the event is global
        for (const guild of client.guilds.cache.values()) {
            try {
                if (guild.members.cache.has(newUser.id)) {
                    // Re-generate description with guild specific language
                    const guildChanges = [];
                    if (oldUser.username !== newUser.username) guildChanges.push(await t('logs.changes.username', guild.id, { old: oldUser.username, new: newUser.username }));
                    if (oldUser.discriminator !== newUser.discriminator) guildChanges.push(await t('logs.changes.discriminator', guild.id, { old: oldUser.discriminator, new: newUser.discriminator }));
                    if (oldUser.avatar !== newUser.avatar) guildChanges.push(await t('logs.changes.avatar', guild.id, { old: oldUser.displayAvatarURL(), new: newUser.displayAvatarURL() }));
                    
                    const description = await t('logs.descriptions.user_update', guild.id, { user: newUser, changes: guildChanges.join('\n') });
                    
                    sendLog(guild, await t('logs.titles.user_update', guild.id), description, '#0000FF', [], newUser);
                }
            } catch (e) {
                // Ignore errors for specific guilds
            }
        }
    }
};
