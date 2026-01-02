const TempRole = require('../database/models/TempRole');

async function checkTempRoles(client) {
    try {
        const expiredRoles = await TempRole.find({ expires_at: { $lte: new Date() } });

        for (const doc of expiredRoles) {
            try {
                const guild = client.guilds.cache.get(doc.guild_id);
                if (guild) {
                    const member = await guild.members.fetch(doc.user_id).catch(() => null);
                    if (member) {
                        const role = guild.roles.cache.get(doc.role_id);
                        if (role) {
                            await member.roles.remove(role, await t('temprole.expired', guild.id));
                        }
                    }
                }
                // Delete from DB regardless if user/guild exists
                await TempRole.deleteOne({ _id: doc._id });
            } catch (err) {
                console.error(`Error processing expired role for user ${doc.user_id}:`, err);
            }
        }
    } catch (err) {
        console.error('Error checking temp roles:', err);
    }
}

module.exports = { checkTempRoles };