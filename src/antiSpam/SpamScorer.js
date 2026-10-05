const { clamp, similarity } = require('./SpamUtils');

function addFactor(factors, key, points) {
    factors[key] = Math.round((factors[key] || 0) + points);
}

function countWithin(messages, intervalMs, now, predicate = () => true) {
    return messages.filter((message) => now - message.timestamp <= intervalMs && predicate(message)).length;
}

function distinctChannels(messages, predicate = () => true) {
    return new Set(messages.filter(predicate).map((message) => message.channelId)).size;
}

function calculateSpamScore(state, config) {
    const factors = {};
    const reasons = [];
    const recent = state.messages.slice(-config.maxTrackedMessages);
    const latest = recent.at(-1);

    if (!latest) return { score: 0, factors, reasons, candidateMessages: [] };

    const now = latest.timestamp;
    const extended = config.windows.extended.intervalMs;
    const inScope = recent.filter((message) => now - message.timestamp <= extended);
    const sameChannel = inScope.filter((message) => message.channelId === latest.channelId);

    let score = 0;
    const add = (key, points, reason) => {
        if (!points) return;
        addFactor(factors, key, points);
        score += points;
        if (reason && points > 0) reasons.push(reason);
    };

    const shortGlobal = countWithin(inScope, config.windows.short.intervalMs, now);
    const mediumGlobal = countWithin(inScope, config.windows.medium.intervalMs, now);
    const longGlobal = countWithin(inScope, config.windows.long.intervalMs, now);
    const shortChannel = countWithin(sameChannel, config.windows.short.intervalMs, now);
    const mediumChannel = countWithin(sameChannel, config.windows.medium.intervalMs, now);

    if (shortGlobal >= config.windows.short.maxMessages) {
        add(
            'rapidMessages',
            config.weights.rapidMessages * Math.min(1.5, shortGlobal / config.windows.short.maxMessages),
            `${shortGlobal} messages en ${Math.round(config.windows.short.intervalMs / 1000)}s`
        );
    }
    if (mediumGlobal >= config.windows.medium.maxMessages || shortChannel >= config.windows.short.maxMessages) {
        add(
            'burst',
            config.weights.burst *
                Math.min(
                    1.4,
                    Math.max(
                        mediumGlobal / config.windows.medium.maxMessages,
                        shortChannel / config.windows.short.maxMessages
                    )
                ),
            `${Math.max(mediumGlobal, shortChannel)} evenements concentres`
        );
    }
    if (longGlobal >= config.windows.long.maxMessages || mediumChannel >= config.windows.medium.maxMessages) {
        add(
            'rapidMessages',
            config.weights.rapidMessages * 0.5,
            `${longGlobal} messages en ${Math.round(config.windows.long.intervalMs / 1000)}s`
        );
    }

    const nonEmpty = inScope.filter((message) => message.normalizedContent);
    const uniqueContents = new Set(nonEmpty.map((message) => message.normalizedContent)).size;
    const exactMatches = latest.normalizedContent
        ? inScope.filter((message) => message.normalizedContent === latest.normalizedContent)
        : [];
    const similarMatches = latest.normalizedContent
        ? inScope.filter(
              (message) =>
                  message.id !== latest.id &&
                  message.normalizedContent &&
                  similarity(message.normalizedContent, latest.normalizedContent) >= config.similarityThreshold
          )
        : [];

    if (exactMatches.length >= 2) {
        add(
            'duplicates',
            config.weights.duplicates * Math.min(1.6, exactMatches.length / 2),
            `${exactMatches.length} contenus identiques`
        );
    }
    if (similarMatches.length >= 1) {
        const totalSimilar = similarMatches.length + 1;
        const multiplier = Math.min(2.2, 1 + (totalSimilar - 2) * 0.35);
        add(
            'similarMessages',
            config.weights.similarMessages * Math.min(1.9, totalSimilar / 2) * multiplier,
            `${totalSimilar} contenus tres similaires`
        );
    }
    if (latest.normalizedContent && latest.normalizedContent.length <= 6 && exactMatches.length >= 2) {
        add('shortRepeats', config.weights.shortRepeats, `${exactMatches.length} messages tres courts repetes`);
    }

    const urlMessages = inScope.filter((message) => message.urls.length > 0);
    const latestUrlKeys = latest.urls.map((url) => url.normalized);
    const repeatedLatestUrls = latestUrlKeys.length
        ? urlMessages.filter((message) => message.urls.some((url) => latestUrlKeys.includes(url.normalized))).length
        : 0;
    const repeatedDomains = latest.urls.length
        ? urlMessages.filter((message) =>
              message.urls.some((url) => latest.urls.some((current) => current.domain === url.domain))
          ).length
        : 0;
    const blockedHits = urlMessages
        .flatMap((message) => message.urls)
        .filter((url) => config.blockedDomains.includes(url.domain)).length;
    const suspiciousUrlHits = urlMessages
        .flatMap((message) => message.urls)
        .filter((url) => config.suspiciousDomains.includes(url.domain) || url.isShortener).length;

    if (repeatedLatestUrls >= 2) {
        add(
            'repeatedLinks',
            config.weights.repeatedLinks * Math.min(1.6, repeatedLatestUrls / 2),
            `${repeatedLatestUrls} repetitions du meme lien`
        );
    }
    if (repeatedDomains >= 4) {
        add('domainRepetition', config.weights.domainRepetition, `${repeatedDomains} liens sur le meme domaine`);
    }
    if (blockedHits > 0) {
        add('blockedDomain', config.weights.blockedDomain, `${blockedHits} domaine(s) bloque(s) detecte(s)`);
    }

    const attachmentMessages = inScope.filter((message) => message.attachments.length > 0);
    const latestFingerprints = latest.attachments.map((attachment) => attachment.fingerprint);
    const repeatedAttachments = latestFingerprints.length
        ? attachmentMessages.filter((message) =>
              message.attachments.some((attachment) => latestFingerprints.includes(attachment.fingerprint))
          ).length
        : 0;
    const suspiciousFiles = attachmentMessages
        .flatMap((message) => message.attachments)
        .filter((attachment) => ['executable', 'script', 'archive'].includes(attachment.kind)).length;

    if (repeatedAttachments >= 2) {
        const multiplier = Math.min(2.4, 1 + (repeatedAttachments - 2) * 0.35);
        add(
            'repeatedAttachments',
            config.weights.repeatedAttachments * Math.min(1.9, repeatedAttachments / 2) * multiplier,
            `${repeatedAttachments} pieces jointes repetees`
        );
    }

    const attachmentShortBurst = countWithin(
        attachmentMessages,
        config.windows.short.intervalMs,
        now,
        (message) => message.attachments.length > 0
    );
    if (attachmentShortBurst >= 3) {
        add(
            'burst',
            config.weights.burst * Math.min(1.8, attachmentShortBurst / 3),
            `${attachmentShortBurst} pieces jointes en ${Math.round(config.windows.short.intervalMs / 1000)}s`
        );
    }
    if (suspiciousFiles > 0 && (repeatedAttachments >= 2 || suspiciousUrlHits > 0 || similarMatches.length >= 1)) {
        add(
            'suspiciousFiles',
            config.weights.suspiciousFiles,
            `${suspiciousFiles} fichier(s) inhabituel(s) dans un comportement repetitif`
        );
    }

    const suspiciousTextHits = inScope.reduce(
        (total, message) => total + message.suspiciousTextIndicators.length,
        0
    );
    const everyoneHits = inScope.filter((message) => Boolean(message.everyoneMention)).length;
    const SCAM_INDICATORS = new Set([
        'free nitro',
        'nitro gift',
        'nitro generator',
        'nitro claim',
        'steam gift scam',
        'steam free scam',
        'crypto giveaway',
        'giveaway claim',
        'free download',
        'click claim',
        'verify account',
        'password reset scam',
        'exe download prompt',
        'early access scam',
        'rare skin scam'
    ]);
    const scamCombinedCount = inScope.filter(
        (message) =>
            message.suspiciousTextIndicators.some((ind) => SCAM_INDICATORS.has(ind)) ||
            message.attachments.some((att) => (att.grabberFilenameHints || 0) >= 2) ||
            message.urls.some((url) => Boolean(url.suspiciousPath) || Boolean(url.ipHostname))
    ).length;
    const suspiciousDomainTldHits = urlMessages.flatMap((message) => message.urls).filter(
        (url) => Boolean(url.suspiciousTld) || Boolean(url.ipHostname) || Boolean(url.suspiciousPath)
    ).length;

    if (suspiciousTextHits > 0 && (repeatedLatestUrls >= 1 || suspiciousFiles > 0 || similarMatches.length >= 1 || scamCombinedCount >= 2)) {
        add(
            'suspiciousContent',
            config.weights.suspiciousContent,
            `${suspiciousTextHits} indicateurs de vocabulaire suspect/scam`
        );
    }
    if (suspiciousDomainTldHits > 0 && (scamCombinedCount >= 2 || repeatedLatestUrls >= 2 || similarMatches.length >= 2 || repeatedAttachments >= 2)) {
        add(
            'suspiciousContent',
            config.weights.suspiciousContent * 0.6,
            `${suspiciousDomainTldHits} URLs à haut risque (TLD suspect / IP / chemin grab)`
        );
    }
    if (everyoneHits >= 2 && scamCombinedCount >= 1) {
        add(
            'suspiciousContent',
            config.weights.suspiciousContent * 0.5,
            `${everyoneHits} mentions everyone combinées au contenu scam`
        );
    }

    const veryYoungCount = inScope.filter((message) => Boolean(message.accountVeryYoung)).length;
    const youngCount = inScope.filter((message) => Boolean(message.accountYoung)).length;
    const avatarMissingCount = inScope.filter((message) => Boolean(message.avatarMissing)).length;
    const anyAccountRisk = veryYoungCount > 0 || (youngCount > 0 && avatarMissingCount > 0);
    if (anyAccountRisk && (scamCombinedCount >= 2 || crossChannelSpread >= 2 || repeatedLatestUrls >= 2 || suspiciousFiles > 0 || everyoneHits >= 1)) {
        const boost = veryYoungCount
            ? config.weights.suspiciousContent * 0.7
            : config.weights.suspiciousContent * 0.35;
        add(
            'suspiciousContent',
            boost,
            veryYoungCount
                ? 'compte Discord < 24h en comportement suspect'
                : 'compte jeune sans avatar en comportement suspect'
        );
    }

    const crossChannelSpread = Math.max(
        latest.normalizedContent
            ? distinctChannels(inScope, (message) => message.normalizedContent === latest.normalizedContent)
            : 0,
        latestUrlKeys.length
            ? distinctChannels(inScope, (message) =>
                  message.urls.some((url) => latestUrlKeys.includes(url.normalized))
              )
            : 0,
        latestFingerprints.length
            ? distinctChannels(inScope, (message) =>
                  message.attachments.some((attachment) => latestFingerprints.includes(attachment.fingerprint))
              )
            : 0
    );
    if (crossChannelSpread >= 3) {
        add(
            'crossChannelSpam',
            config.weights.crossChannelSpam * Math.min(1.4, crossChannelSpread / 3),
            `diffusion sur ${crossChannelSpread} salons`
        );
    }

    const variedConversation = uniqueContents >= Math.max(2, Math.floor(nonEmpty.length * 0.7));
    const lowRepetition = exactMatches.length <= 2 && repeatedLatestUrls <= 1 && repeatedAttachments <= 1;
    const multiChannelConversation = distinctChannels(inScope) >= 3;

    if (multiChannelConversation && variedConversation && lowRepetition) {
        add('conversationMitigation', -config.weights.conversationMitigation, null);
    }
    if ((latest.isReply || latest.mentionsCount > 0) && variedConversation) {
        add('variedConversationMitigation', -config.weights.variedConversationMitigation, null);
    }
    if (
        state.lastActionLevel > 0 &&
        now - state.lastActionAt <= config.actions.escalationWindowMs &&
        score >= config.thresholds.suspicion
    ) {
        add('escalation', config.weights.escalation, 'recidive apres action precedente');
    }

    const candidateSet = new Map();
    const mediumScope = inScope.filter((message) => now - message.timestamp <= config.windows.medium.intervalMs);
    for (const message of mediumScope) {
        const sameText = latest.normalizedContent && message.normalizedContent === latest.normalizedContent;
        const sameUrl = latestUrlKeys.length && message.urls.some((url) => latestUrlKeys.includes(url.normalized));
        const sameAttachment =
            latestFingerprints.length &&
            message.attachments.some((attachment) => latestFingerprints.includes(attachment.fingerprint));
        if (sameText || sameUrl || sameAttachment || message.id === latest.id) {
            candidateSet.set(message.id, { id: message.id, channelId: message.channelId });
        }
    }

    return {
        score: clamp(Math.round(score), 0, config.maxScore),
        factors,
        reasons,
        candidateMessages: [...candidateSet.values()]
    };
}

module.exports = { calculateSpamScore };
