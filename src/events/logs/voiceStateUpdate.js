const { sendLog } = require('../../utils/logManager');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        if (!newState.guild) return;
        const member = newState.member;
        
        // Join
        if (!oldState.channelId && newState.channelId) {
            const description = await t('logs.descriptions.voice_join', newState.guild.id, { member: member, channel: newState.channel });
            sendLog(newState.guild, await t('logs.titles.voice_join', newState.guild.id), description, '#00FF00', [], member.user);
        }
        
        // Leave
        else if (oldState.channelId && !newState.channelId) {
            const description = await t('logs.descriptions.voice_leave', newState.guild.id, { member: member, channel: oldState.channel });
            sendLog(newState.guild, await t('logs.titles.voice_leave', newState.guild.id), description, '#FF0000', [], member.user);
        }
        
        // Move
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const description = await t('logs.descriptions.voice_move', newState.guild.id, { member: member, old: oldState.channel, new: newState.channel });
            sendLog(newState.guild, await t('logs.titles.voice_move', newState.guild.id), description, '#FFA500', [], member.user);
        }
    }
};
