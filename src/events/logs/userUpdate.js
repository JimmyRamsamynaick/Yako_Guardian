const { sendLog } = require('../../utils/logManager');

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
        if (oldUser.username !== newUser.username) changes.push(`**Username:** \`${oldUser.username}\` ➔ \`${newUser.username}\``);
        if (oldUser.discriminator !== newUser.discriminator) changes.push(`**Discriminator:** \`${oldUser.discriminator}\` ➔ \`${newUser.discriminator}\``);
        if (oldUser.avatar !== newUser.avatar) changes.push(`**Avatar:** [Ancien](${oldUser.displayAvatarURL()}) ➔ [Nouveau](${newUser.displayAvatarURL()})`);

        if (changes.length === 0) return;

        const description = `Le profil de ${newUser} a été mis à jour.\n\n${changes.join('\n')}`;

        // Broadcast to all guilds where the user is present and logs are enabled
        // We iterate because the event is global
        for (const guild of client.guilds.cache.values()) {
            try {
                if (guild.members.cache.has(newUser.id)) {
                     sendLog(guild, '👤 Profil Utilisateur Modifié', description, '#0000FF', [], newUser);
                }
            } catch (e) {
                // Ignore errors for specific guilds
            }
        }
    }
};