const { clamp } = require('./SpamUtils');

class SpamStore {
    constructor() {
        this.guilds = new Map();
    }

    getGuild(guildId) {
        if (!this.guilds.has(guildId)) this.guilds.set(guildId, new Map());
        return this.guilds.get(guildId);
    }

    getUserState(guildId, userId) {
        const guild = this.getGuild(guildId);
        if (!guild.has(userId)) {
            guild.set(userId, {
                currentScore: 0,
                lastEvaluatedAt: Date.now(),
                lastSeenAt: Date.now(),
                lastActionAt: 0,
                lastActionLevel: 0,
                recentActions: [],
                messages: []
            });
        }
        return guild.get(userId);
    }

    applyDecay(state, config, now = Date.now()) {
        const seconds = Math.max(0, (now - state.lastEvaluatedAt) / 1000);
        state.currentScore = clamp(state.currentScore - seconds * config.decayPerSecond, 0, config.maxScore);
        state.lastEvaluatedAt = now;
        return state.currentScore;
    }

    pruneState(state, config, now = Date.now()) {
        state.messages = state.messages.filter((message) => now - message.timestamp <= config.historyRetentionMs);
        if (state.messages.length > config.maxTrackedMessages) {
            state.messages = state.messages.slice(-config.maxTrackedMessages);
        }
        const actionWindow = Math.max(config.actions?.escalationWindowMs || 900000, config.historyRetentionMs);
        state.recentActions = state.recentActions.filter((action) => now - action.at <= actionWindow);
    }

    recordMessage(guildId, userId, snapshot, config) {
        const state = this.getUserState(guildId, userId);
        this.applyDecay(state, config, snapshot.timestamp);
        state.messages.push(snapshot);
        state.lastSeenAt = snapshot.timestamp;
        this.pruneState(state, config, snapshot.timestamp);
        return state;
    }

    registerAction(state, level, score, now = Date.now()) {
        state.lastActionLevel = Math.max(state.lastActionLevel, level);
        state.lastActionAt = now;
        state.recentActions.push({ at: now, level, score });
    }

    cleanup(maxIdleMs = 20 * 60 * 1000) {
        const now = Date.now();
        for (const [guildId, guildMap] of this.guilds.entries()) {
            for (const [userId, state] of guildMap.entries()) {
                if (state.messages.length === 0 && state.currentScore === 0 && now - state.lastSeenAt > maxIdleMs) {
                    guildMap.delete(userId);
                }
            }
            if (guildMap.size === 0) this.guilds.delete(guildId);
        }
    }
}

module.exports = { SpamStore };
