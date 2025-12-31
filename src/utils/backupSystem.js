const AutoBackup = require('../database/models/AutoBackup');
const { createBackup } = require('./backupHandler');
const logger = require('./logger');

async function checkAutoBackups(client) {
    try {
        const now = new Date();
        const pendingBackups = await AutoBackup.find({ next_backup: { $lte: now } });

        for (const doc of pendingBackups) {
            try {
                const guild = client.guilds.cache.get(doc.guild_id);
                if (guild) {
                    const backupName = `auto-${now.toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
                    
                    await createBackup(guild, backupName);
                    
                    // Update Next Backup
                    const nextBackup = new Date(now.getTime() + doc.frequency_days * 24 * 60 * 60 * 1000);
                    
                    doc.last_backup = now;
                    doc.next_backup = nextBackup;
                    await doc.save();
                    
                    logger.info(`AutoBackup created for guild ${guild.name} (${guild.id}): ${backupName}`);
                } else {
                    // Guild not found (bot kicked?), maybe delete doc or ignore?
                    // For now, ignore.
                }
            } catch (err) {
                logger.error(`Error processing AutoBackup for guild ${doc.guild_id}:`, err);
            }
        }
    } catch (err) {
        logger.error('Error checking auto backups:', err);
    }
}

module.exports = { checkAutoBackups };