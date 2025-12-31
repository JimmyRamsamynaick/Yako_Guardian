const { AuditLogEvent } = require('discord.js');

async function getExecutor(guild, type, targetId = null) {
    try {
        const logs = await guild.fetchAuditLogs({ limit: 5, type }); // Fetch more to find the right one
        
        let entry;
        if (targetId) {
            entry = logs.entries.find(e => e.targetId === targetId);
        } else {
            entry = logs.entries.first();
        }

        if (!entry) return null;
        
        // Check if the log entry is recent (within last 5 seconds)
        if (Date.now() - entry.createdTimestamp > 5000) return null;
        
        return entry.executor;
    } catch (e) {
        return null;
    }
}

module.exports = { getExecutor };
