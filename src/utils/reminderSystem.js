const Reminder = require('../database/models/Reminder');
const logger = require('./logger');

async function checkReminders(client) {
    try {
        const now = new Date();
        const expiredReminders = await Reminder.find({ expiresAt: { $lte: now } });

        for (const rem of expiredReminders) {
            // Fetch user/channel
            try {
                // Try to send to channel first
                let sent = false;
                if (rem.guildId && rem.channelId) {
                    const guild = client.guilds.cache.get(rem.guildId);
                    if (guild) {
                        const channel = guild.channels.cache.get(rem.channelId);
                        if (channel && channel.isTextBased()) {
                            await channel.send(`⏰ <@${rem.userId}> **Rappel :** ${rem.content}`);
                            sent = true;
                        }
                    }
                }

                // If channel failed (deleted, no perms), try DM
                if (!sent) {
                    const user = await client.users.fetch(rem.userId).catch(() => null);
                    if (user) {
                        await user.send(`⏰ **Rappel :** ${rem.content}`).catch(() => null);
                    }
                }
            } catch (innerErr) {
                logger.error(`Failed to process reminder ${rem._id}:`, innerErr);
            }

            // Delete processed reminder
            await Reminder.deleteOne({ _id: rem._id });
        }
    } catch (err) {
        logger.error('Error checking reminders:', err);
    }
}

module.exports = { checkReminders };
