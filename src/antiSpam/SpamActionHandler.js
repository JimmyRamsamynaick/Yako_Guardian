const ms = require('ms');
const { addSanction } = require('../utils/moderation/sanctionUtils');
const { logDetection } = require('./SpamLogger');

const ACTION_LEVELS = { none: 0, warning: 1, delete: 2, timeout: 3, severe: 4 };
const ACTION_BY_LEVEL = ['none', 'warning', 'delete', 'timeout', 'severe'];

function decideAction(effectiveScore, state, config) {
    let action = 'none';
    if (config.actions.severe.enabled && effectiveScore >= config.actions.severe.score) action = 'severe';
    else if (config.actions.timeout.enabled && effectiveScore >= config.actions.timeout.score) action = 'timeout';
    else if (config.actions.delete.enabled && effectiveScore >= config.actions.delete.score) action = 'delete';
    else if (config.actions.warning.enabled && effectiveScore >= config.actions.warning.score) action = 'warning';

    if (action !== 'none' && state.lastActionLevel > 0 && Date.now() - state.lastActionAt <= config.actions.escalationWindowMs) {
        const currentLevel = ACTION_LEVELS[action];
        if (currentLevel <= state.lastActionLevel) {
            action = ACTION_BY_LEVEL[Math.min(ACTION_BY_LEVEL.length - 1, state.lastActionLevel + 1)];
        }
    }

    return action;
}

async function deleteUserSpamMessages(client, guild, state, config) {
    if (!state?.messages?.length) return 0;

    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const retentionMs = config?.historyRetentionMs || 10 * 60 * 1000;
    const maxRetentionMs = Math.min(retentionMs * 1.5, fourteenDays);

    const grouped = new Map();
    for (const entry of state.messages) {
        if (now - entry.timestamp > maxRetentionMs) continue;
        if (!entry?.id || !entry?.channelId) continue;
        if (!grouped.has(entry.channelId)) grouped.set(entry.channelId, new Set());
        grouped.get(entry.channelId).add(entry.id);
    }

    let deleted = 0;
    for (const [channelId, ids] of grouped.entries()) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased?.()) continue;

        const chunks = [];
        let buffer = [];
        for (const id of ids) {
            buffer.push(id);
            if (buffer.length >= 50) {
                chunks.push(buffer);
                buffer = [];
            }
        }
        if (buffer.length) chunks.push(buffer);

        for (const chunkIds of chunks) {
            const fetched = await channel.messages
                .fetch({ message: chunkIds, limit: chunkIds.length })
                .catch(() => null);
            if (!fetched || fetched.size === 0) continue;

            const deletable = [];
            for (const current of fetched.values()) {
                if (!current?.deletable) continue;
                if (current.author.id !== state.messages[0]?.userId && current.author.id !== guild.client?.user?.id) continue;
                if (now - Number(current.createdTimestamp || 0) > fourteenDays) {
                    await current.delete().catch(() => {});
                    deleted++;
                } else {
                    deletable.push(current);
                }
            }

            if (deletable.length === 0) continue;
            if (deletable.length === 1) {
                await deletable[0].delete().catch(() => {});
                deleted++;
                continue;
            }

            const done = await channel.bulkDelete(deletable, true).catch(() => null);
            deleted += done?.size || 0;
        }
    }

    return deleted;
}

async function persistSanction(message, type, reason, duration = null) {
    await addSanction(
        message.guild.id,
        message.author.id,
        message.client.user.id,
        type,
        reason,
        duration
    ).catch(() => {});
}

async function softWarn(message, reason, actionLabel) {
    const warning = await message.channel
        .send({
            content: `⚠️ ${message.author}, comportement suspect détecté.\nRaison : **${reason}**\nAction : **${actionLabel}**`
        })
        .catch(() => null);

    if (warning) setTimeout(() => warning.delete().catch(() => {}), 8000);
}

async function handleSpamAction(client, message, result, state, config, guildConfig) {
    const benignDominantAttenuation =
        result.score >= config.thresholds.activity &&
        result.score < config.thresholds.suspicion &&
        ((result.factors.duplicates || 0) +
            (result.factors.repeatedLinks || 0) +
            (result.factors.blockedDomain || 0) +
            (result.factors.crossChannelSpam || 0) +
            (result.factors.suspiciousContent || 0) +
            (result.factors.suspiciousFiles || 0) +
            (result.factors.similarMessages || 0) +
            (result.factors.repeatedAttachments || 0)) <
            config.thresholds.activity;
    const preEffectiveScore = benignDominantAttenuation
        ? Math.max(0, Math.round(result.score * 0.6))
        : result.score;

    const baseScore = Math.max(preEffectiveScore, Math.min(Math.round(state.currentScore), preEffectiveScore + 20));
    const strongSignalsScore =
        (result.factors.duplicates || 0) +
        (result.factors.repeatedLinks || 0) +
        (result.factors.blockedDomain || 0) +
        (result.factors.crossChannelSpam || 0) +
        (result.factors.suspiciousContent || 0) +
        (result.factors.suspiciousFiles || 0) +
        (result.factors.escalation || 0);
    const recentStrongSignalsWindow = state.recentActions.filter(
        (entry) => entry.level >= 2 && Date.now() - entry.at <= (config.actions?.escalationWindowMs || 900000)
    ).length;
    const benignDominant =
        baseScore >= config.thresholds.severe &&
        strongSignalsScore < config.thresholds.probable &&
        recentStrongSignalsWindow === 0;
    const effectiveScore = benignDominant
        ? Math.min(baseScore, Math.max(config.thresholds.probable, strongSignalsScore + 15))
        : baseScore;
    const action = decideAction(effectiveScore, state, config);

    if (action === 'none') return { triggered: false, effectiveScore };

    const reason = result.reasons.join(' • ') || 'Spam détecté par score comportemental';
    let actionLabel = 'Surveillance';

    if (action === 'warning') {
        await softWarn(message, reason, 'Avertissement');
        await persistSanction(message, 'warn', `[AntiSpam] ${reason}`);
        actionLabel = 'Warning';
    }

    if (action === 'delete' || action === 'timeout' || action === 'severe') {
        const deletedCount = await deleteUserSpamMessages(client, message.guild, state, config);
        actionLabel = deletedCount > 1 ? `Suppression complète (${deletedCount} msgs)` : 'Suppression complète';
    }

    if (action === 'timeout') {
        const duration = config.actions.timeout.durationMs;
        if (message.member?.moderatable) {
            await message.member.timeout(duration, `[AntiSpam] ${reason}`).catch(() => {});
            await persistSanction(message, 'timeout', `[AntiSpam] ${reason}`, duration);
            actionLabel = `Timeout ${ms(duration)}`;
        }
        await softWarn(message, reason, actionLabel);
    }

    if (action === 'severe') {
        const type = config.actions.severe.type || 'kick';
        const duration = config.actions.severe.durationMs;

        if (type === 'ban' && message.member?.bannable) {
            await message.member.ban({ reason: `[AntiSpam] ${reason}` }).catch(() => {});
            await persistSanction(message, 'ban', `[AntiSpam] ${reason}`);
            actionLabel = 'Ban';
        } else if (type === 'timeout' && message.member?.moderatable) {
            await message.member.timeout(duration, `[AntiSpam] ${reason}`).catch(() => {});
            await persistSanction(message, 'timeout', `[AntiSpam] ${reason}`, duration);
            actionLabel = `Timeout severe ${ms(duration)}`;
        } else if (message.member?.kickable) {
            await message.member.kick(`[AntiSpam] ${reason}`).catch(() => {});
            await persistSanction(message, 'kick', `[AntiSpam] ${reason}`);
            actionLabel = 'Kick';
        }
    }

    const level = ACTION_LEVELS[action];
    state.lastActionAt = Date.now();
    state.lastActionLevel = Math.max(state.lastActionLevel, level);
    state.recentActions.push({ at: state.lastActionAt, level, score: effectiveScore });

    await logDetection(message, result, actionLabel, guildConfig, effectiveScore);
    return { triggered: true, action, effectiveScore };
}

module.exports = { handleSpamAction };
