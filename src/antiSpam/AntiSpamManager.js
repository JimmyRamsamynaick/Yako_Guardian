const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const { checkSubscription } = require('../utils/subscription');
const { isBotOwner } = require('../utils/ownerUtils');
const { isWhitelisted } = require('../utils/moderation/listUtils');
const { buildAntiSpamConfig } = require('./SpamConfig');
const { buildMessageSnapshot } = require('./SpamUtils');
const { SpamStore } = require('./SpamStore');
const { calculateSpamScore } = require('./SpamScorer');
const { handleSpamAction } = require('./SpamActionHandler');
const { logDebug } = require('./SpamLogger');

function hasIgnoredPermission(member, ignoredPermissions = []) {
    return ignoredPermissions.some((permission) => {
        const flag = typeof permission === 'bigint' ? permission : PermissionFlagsBits[permission];
        return flag ? member.permissions.has(flag) : false;
    });
}

function shouldIgnoreMessage(message, config) {
    if (!message.guild || !message.member || message.author.bot) return true;
    if (config.ignoredUsers.includes(message.author.id)) return true;
    if (config.ignoredChannels.includes(message.channelId)) return true;
    if (message.channel?.parentId && config.ignoredCategories.includes(message.channel.parentId)) return true;
    if (message.member.roles.cache.some((role) => config.ignoredRoles.includes(role.id))) return true;
    if (hasIgnoredPermission(message.member, config.ignoredPermissions)) return true;
    return false;
}

class AntiSpamManager {
    constructor() {
        this.store = new SpamStore();
        this.cleanupTimer = setInterval(() => this.store.cleanup(), 60 * 1000);
        this.cleanupTimer.unref?.();
    }

    async handleMessage(client, message, guildConfig) {
        if (!message.guild || message.author.bot) return false;

        if (!guildConfig || typeof guildConfig !== 'object') {
            logger.warn(`[AntiSpam] Config introuvable pour guild=${message.guild.id}, skip. Message id=${message.id} author=${message.author.id}.`);
            return false;
        }

        const config = buildAntiSpamConfig(guildConfig, message.channelId);
        if (!config.enabled) return false;

        const subscriptionActive = checkSubscription(message.guild.id);
        if (shouldIgnoreMessage(message, config)) return false;
        if (await isBotOwner(message.author.id)) return false;
        if (message.author.id === message.guild.ownerId) return false;
        if (isWhitelisted(message.guild.id, message.member)) return false;

        const snapshot = buildMessageSnapshot(message, config);
        const state = this.store.recordMessage(message.guild.id, message.author.id, snapshot, config);
        const result = calculateSpamScore(state, config);

        state.currentScore = Math.max(state.currentScore, result.score);

        if (config.debug) {
            const debugScore = Math.max(
                result.score,
                Math.min(Math.round(state.currentScore), result.score + 20)
            );
            logDebug(message, result, debugScore);
        }

        if (result.score < config.thresholds.activity) return false;

        let actionMode = subscriptionActive ? 'full' : 'light';
        if (!subscriptionActive && result.score >= config.actions.warning.score && result.score < config.actions.severe.score) {
            actionMode = 'light';
        }
        if (!subscriptionActive && result.score >= config.actions.severe.score) {
            logger.warn(`[AntiSpam] Score élevé ${result.score} sur guild=${message.guild.id} user=${message.author.id} mais licence inactive : actions sévères désactivées.`);
        }

        const actionResult = await handleSpamAction(
            client,
            message,
            result,
            state,
            actionMode === 'full' ? config : {
                ...config,
                actions: {
                    ...config.actions,
                    timeout: { ...config.actions.timeout, enabled: false },
                    severe: { ...config.actions.severe, enabled: false },
                    delete: config.actions.delete,
                    warning: config.actions.warning,
                    escalationWindowMs: config.actions.escalationWindowMs
                }
            },
            guildConfig
        );
        return Boolean(actionResult.triggered);
    }
}

module.exports = {
    AntiSpamManager,
    shouldIgnoreMessage
};
