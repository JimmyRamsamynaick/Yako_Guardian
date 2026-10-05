const DEFAULT_ANTISPAM_CONFIG = Object.freeze({
    enabled: false,
    debug: false,
    profile: 'balanced',
    similarityThreshold: 0.86,
    historyRetentionMs: 10 * 60 * 1000,
    cleanupIntervalMs: 60 * 1000,
    decayPerSecond: 0.8,
    maxScore: 100,
    maxTrackedMessages: 80,
    maxUrlsPerMessage: 10,
    maxAttachmentsPerMessage: 10,
    antiSpamChannels: [],
    trustedDomains: ['discord.com', 'discord.gg', 'github.com', 'youtube.com', 'youtu.be'],
    blockedDomains: [],
    suspiciousDomains: ['bit.ly', 'tinyurl.com', 'grabify.link'],
    ignoredUsers: [],
    ignoredRoles: [],
    ignoredChannels: [],
    ignoredCategories: [],
    ignoredPermissions: ['Administrator', 'ManageMessages'],
    windows: {
        short: { intervalMs: 3000, maxMessages: 5 },
        medium: { intervalMs: 10000, maxMessages: 15 },
        long: { intervalMs: 30000, maxMessages: 30 },
        extended: { intervalMs: 120000, maxMessages: 60 }
    },
    thresholds: {
        activity: 20,
        suspicion: 40,
        probable: 60,
        severe: 80,
        critical: 95
    },
    weights: {
        rapidMessages: 18,
        burst: 14,
        duplicates: 22,
        similarMessages: 14,
        shortRepeats: 10,
        repeatedAttachments: 18,
        repeatedLinks: 20,
        domainRepetition: 10,
        crossChannelSpam: 24,
        suspiciousContent: 30,
        suspiciousFiles: 32,
        blockedDomain: 45,
        conversationMitigation: 20,
        variedConversationMitigation: 12,
        escalation: 12
    },
    actions: {
        warning: { enabled: true, score: 40, cooldownMs: 30000 },
        delete: { enabled: true, score: 60, deleteRecentCount: 4 },
        timeout: { enabled: true, score: 80, durationMs: 10 * 60 * 1000 },
        severe: { enabled: false, score: 95, type: 'kick', durationMs: 60 * 60 * 1000 },
        escalationWindowMs: 15 * 60 * 1000
    },
    channelOverrides: []
});

const PRESET_PATCHES = Object.freeze({
    lenient: {
        thresholds: { activity: 25, suspicion: 45, probable: 68, severe: 86, critical: 97 },
        actions: {
            warning: { score: 45 },
            delete: { score: 68 },
            timeout: { score: 86 },
            severe: { score: 97 }
        }
    },
    balanced: {},
    strict: {
        thresholds: { activity: 15, suspicion: 35, probable: 55, severe: 75, critical: 90 },
        actions: {
            warning: { score: 35 },
            delete: { score: 55 },
            timeout: { score: 75 },
            severe: { score: 90 }
        }
    }
});

function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
    if (!isPlainObject(base)) return override;
    const output = { ...base };
    for (const [key, value] of Object.entries(override || {})) {
        if (Array.isArray(value)) {
            output[key] = [...value];
        } else if (isPlainObject(value) && isPlainObject(base[key])) {
            output[key] = deepMerge(base[key], value);
        } else {
            output[key] = value;
        }
    }
    return output;
}

function applyLegacyWindow(config, raw) {
    if (Number.isFinite(raw?.limit) && Number.isFinite(raw?.time) && !(raw?.windows && raw.windows.short)) {
        config.windows.short = {
            ...config.windows.short,
            maxMessages: raw.limit,
            intervalMs: raw.time
        };
    }
    return config;
}

function buildAntiSpamConfig(guildConfig, channelId) {
    const raw = guildConfig?.moderation?.antispam || {};
    const preset = raw.profile && PRESET_PATCHES[raw.profile] ? PRESET_PATCHES[raw.profile] : PRESET_PATCHES.balanced;

    let config = deepMerge(DEFAULT_ANTISPAM_CONFIG, preset);
    config = deepMerge(config, raw);
    config = applyLegacyWindow(config, raw);

    if (Array.isArray(config.antiSpamChannels) && config.antiSpamChannels.includes(channelId)) {
        config = deepMerge(config, {
            thresholds: {
                suspicion: Math.max(20, config.thresholds.suspicion - 5),
                probable: Math.max(35, config.thresholds.probable - 5)
            },
            actions: {
                warning: { score: Math.max(20, config.actions.warning.score - 5) },
                delete: { score: Math.max(35, config.actions.delete.score - 5) }
            }
        });
    }

    const override = (config.channelOverrides || []).find((entry) => entry?.channelId === channelId);
    if (override) {
        config = deepMerge(config, override);
    }

    return config;
}

module.exports = {
    DEFAULT_ANTISPAM_CONFIG,
    PRESET_PATCHES,
    deepMerge,
    buildAntiSpamConfig
};
