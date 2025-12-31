const { AuditLogEvent } = require('discord.js');
const { checkAntiraid } = require('../../utils/antiraid');
const { getExecutor } = require('../../utils/audit');

module.exports = {
    name: 'webhookUpdate',
    async execute(client, channel) {
        if (!channel.guild) return;
        
        // Webhook Create/Delete/Update all trigger this
        const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.WebhookCreate });
        const entry = logs.entries.first();
        
        // Check if recent
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

        const executor = entry.executor;
        const member = await channel.guild.members.fetch(executor.id).catch(() => null);
        
        if (!member) return;

        const triggered = await checkAntiraid(client, channel.guild, member, 'antiwebhook');
        
        if (triggered && entry.target) {
            // Try to delete the webhook created
            // entry.target is a Webhook object (partial)
            try {
                const webhook = await channel.fetchWebhooks().then(whs => whs.get(entry.target.id));
                if (webhook) await webhook.delete('Yako Guardian | Anti-Webhook');
            } catch (e) {}
        }
    }
};
