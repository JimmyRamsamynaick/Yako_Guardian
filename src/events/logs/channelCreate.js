const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'channelCreate',
    async execute(client, channel) {
        if (!channel.guild) return;
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        
        const description = await t('logs.descriptions.channel_create', channel.guild.id, { channel: channel, name: channel.name });
        const fields = [
            { name: await t('logs.fields.type', channel.guild.id), value: `${channel.type}`, inline: true },
            { name: await t('logs.fields.category', channel.guild.id), value: channel.parent ? channel.parent.name : await t('common.none', channel.guild.id), inline: true },
            { name: await t('logs.fields.executed_by', channel.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', channel.guild.id) }
        ];
        
        sendLog(channel.guild, await t('logs.titles.channel_create', channel.guild.id), description, '#00FF00', fields, executor);
    }
};
