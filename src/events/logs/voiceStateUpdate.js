const { sendLog } = require('../../utils/logManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        if (!newState.guild) return;
        const member = newState.member;
        
        // Join
        if (!oldState.channelId && newState.channelId) {
            sendLog(newState.guild, '🔊 Vocal Rejoint', `${member} a rejoint le salon ${newState.channel}`, '#00FF00', [], member.user);
        }
        
        // Leave
        else if (oldState.channelId && !newState.channelId) {
            sendLog(newState.guild, '🔇 Vocal Quitté', `${member} a quitté le salon ${oldState.channel}`, '#FF0000', [], member.user);
        }
        
        // Move
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            sendLog(newState.guild, '↔️ Vocal Déplacé', `${member} a changé de salon: ${oldState.channel} ➔ ${newState.channel}`, '#FFA500', [], member.user);
        }
    }
};