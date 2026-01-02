const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'channelUpdate',
    async execute(client, oldChannel, newChannel) {
        if (!newChannel.guild) return;
        if (oldChannel.rawPosition !== newChannel.rawPosition) return;

        const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
        
        const changes = [];
        if (oldChannel.name !== newChannel.name) changes.push(await t('logs.changes.name', newChannel.guild.id, { old: oldChannel.name, new: newChannel.name }));
        if (oldChannel.topic !== newChannel.topic) changes.push(await t('logs.changes.topic', newChannel.guild.id, { old: oldChannel.topic || await t('common.none', newChannel.guild.id), new: newChannel.topic || await t('common.none', newChannel.guild.id) }));
        if (oldChannel.nsfw !== newChannel.nsfw) changes.push(await t('logs.changes.nsfw', newChannel.guild.id, { old: oldChannel.nsfw, new: newChannel.nsfw }));
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(await t('logs.changes.slowmode', newChannel.guild.id, { old: oldChannel.rateLimitPerUser, new: newChannel.rateLimitPerUser }));
        
        if (changes.length === 0) return;

        const description = await t('logs.descriptions.channel_update', newChannel.guild.id, { channel: newChannel, changes: changes.join('\n') });
        
        sendLog(newChannel.guild, await t('logs.titles.channel_update', newChannel.guild.id), description, '#FFA500', [
            { name: await t('logs.fields.executed_by', newChannel.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', newChannel.guild.id) }
        ], executor);
    }
};
