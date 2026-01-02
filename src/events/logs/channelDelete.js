const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../../utils/logManager');
const { getExecutor } = require('../../utils/audit');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'channelDelete',
    async execute(client, channel) {
        if (!channel.guild) return;
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
        
        const description = await t('logs.descriptions.channel_delete', channel.guild.id, { name: channel.name });
        const fields = [
            { name: await t('logs.fields.type', channel.guild.id), value: `${channel.type}`, inline: true },
            { name: await t('logs.fields.executed_by', channel.guild.id), value: executor ? `${executor.tag} (\`${executor.id}\`)` : await t('logs.fields.unknown', channel.guild.id) }
        ];
        
        sendLog(channel.guild, await t('logs.titles.channel_delete', channel.guild.id), description, '#FF0000', fields, executor);
    }
};
