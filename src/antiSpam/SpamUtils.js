const SHORTENER_DOMAINS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'shorturl.at', 'rebrand.ly']);
const SUSPICIOUS_URL_TLDS = new Set(['xyz', 'top', 'club', 'click', 'work', 'zip', 'ru', 'cn', 'tk', 'gq', 'cf', 'ga', 'ml']);
const GRABBER_FILENAME_HINTS = ['nitro', 'generator', 'crack', 'hack', 'steam', 'discord', 'gift', 'token', 'free_', 'checker', 'claim', 'password', 'credential', 'wallet', 'miner', 'rar crack', 'cracked'];
const SCAM_PHRASES = [
    { keys: ['nitro', 'free'], label: 'free nitro' },
    { keys: ['nitro', 'gift'], label: 'nitro gift' },
    { keys: ['nitro', 'generator'], label: 'nitro generator' },
    { keys: ['nitro', 'claim'], label: 'nitro claim' },
    { keys: ['steam', 'gift'], label: 'steam gift scam' },
    { keys: ['steam', 'free'], label: 'steam free scam' },
    { keys: ['crypto', 'giveaway'], label: 'crypto giveaway' },
    { keys: ['giveaway', 'claim'], label: 'giveaway claim' },
    { keys: ['free', 'download'], label: 'free download' },
    { keys: ['click', 'claim'], label: 'click claim' },
    { keys: ['verify', 'account'], label: 'verify account' },
    { keys: ['password', 'reset'], label: 'password reset scam' },
    { keys: ['download', 'exe'], label: 'exe download prompt' },
    { keys: ['early', 'access'], label: 'early access scam' },
    { keys: ['rare', 'skin'], label: 'rare skin scam' }
];
const URL_REGEX = /(https?:\/\/[^\s<>{}]+|www\.[^\s<>{}]+)/gi;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function normalizeText(text = '') {
    return String(text)
        .normalize('NFKC')
        .toLowerCase()
        .replace(URL_REGEX, ' <url> ')
        .replace(/[`*_~|\\()[\]{}""''.,!?;:+\-=/]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);
}

function toBigrams(value) {
    if (!value) return [];
    if (value.length < 2) return [value];
    const grams = [];
    for (let i = 0; i < value.length - 1; i++) grams.push(value.slice(i, i + 2));
    return grams;
}

function similarity(a, b) {
    const left = normalizeText(a);
    const right = normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    const leftMap = new Map();
    for (const gram of toBigrams(left)) leftMap.set(gram, (leftMap.get(gram) || 0) + 1);
    let overlap = 0;
    for (const gram of toBigrams(right)) {
        const count = leftMap.get(gram) || 0;
        if (count > 0) {
            overlap++;
            leftMap.set(gram, count - 1);
        }
    }
    return (2 * overlap) / (Math.max(1, left.length - 1) + Math.max(1, right.length - 1));
}

function normalizeUrl(raw) {
    try {
        const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
        const hostname = url.hostname.toLowerCase();
        const tld = hostname.split('.').pop() || '';
        const path = url.pathname.toLowerCase();
        const suspiciousPath =
            /(nitro|gift|claim|grab|token|password|steal|login|auth|verify|generator|crack|checker)/.test(path);
        return {
            raw,
            normalized: `${url.protocol}//${hostname}${url.pathname}`.replace(/\/$/, ''),
            domain: hostname,
            path: url.pathname,
            tld,
            isShortener: SHORTENER_DOMAINS.has(hostname),
            suspiciousTld: SUSPICIOUS_URL_TLDS.has(tld),
            suspiciousPath,
            ipHostname: /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
        };
    } catch {
        return null;
    }
}

function extractUrls(content, maxUrls = 10) {
    const matches = String(content || '').match(URL_REGEX) || [];
    const urls = [];
    const seen = new Set();
    for (const match of matches.slice(0, maxUrls)) {
        const parsed = normalizeUrl(match);
        if (parsed && !seen.has(parsed.normalized)) {
            seen.add(parsed.normalized);
            urls.push(parsed);
        }
    }
    return urls;
}

function fileExt(filename = '') {
    const index = filename.lastIndexOf('.');
    return index === -1 ? '' : filename.slice(index + 1).toLowerCase();
}

function classifyAttachment(attachment) {
    const ext = fileExt(attachment.name);
    const contentType = String(attachment.contentType || '').toLowerCase();
    if (contentType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['exe', 'scr', 'com', 'msi', 'apk', 'jar'].includes(ext)) return 'executable';
    if (['js', 'vbs', 'ps1', 'bat', 'cmd', 'sh', 'hta'].includes(ext)) return 'script';
    if (['zip', 'rar', '7z', 'iso'].includes(ext)) return 'archive';
    return 'file';
}

function attachmentFingerprint(attachment) {
    const kind = classifyAttachment(attachment);
    const filename = String(attachment.name || '').toLowerCase();
    const grabberHints = GRABBER_FILENAME_HINTS.filter((hint) => filename.includes(hint)).length;
    return {
        value: `${kind}:${filename}:${attachment.size || 0}`,
        kind,
        filename,
        grabberHints
    };
}

function extractAttachments(message, config) {
    return Array.from(message.attachments?.values?.() || [])
        .slice(0, config.maxAttachmentsPerMessage)
        .map((attachment) => {
            const fingerprint = attachmentFingerprint(attachment);
            return {
                url: String(attachment.url || attachment.proxyURL || ''),
                filename: String(attachment.name || '').slice(0, 150),
                contentType: String(attachment.contentType || '').slice(0, 100),
                size: Number(attachment.size || 0),
                kind: fingerprint.kind,
                grabberFilenameHints: fingerprint.grabberHints,
                fingerprint: fingerprint.value
            };
        });
}

function detectSuspiciousTextIndicators(content = '') {
    const value = String(content);
    const lower = value.toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);
    const indicators = [];
    if (/(powershell|invoke-webrequest|cmd\.exe|wscript|mshta|fromcharcode|eval\(|atob\()/i.test(lower)) indicators.push('script/obfuscation');
    if (/[A-Za-z0-9+/=]{100,}/.test(value)) indicators.push('base64-like blob');
    if (/https?:\/\/\S+@/i.test(value)) indicators.push('credential-style url');
    for (const phrase of SCAM_PHRASES) {
        if (phrase.keys.every((key) => tokens.includes(key) || lower.includes(` ${key} `) || lower.startsWith(`${key} `) || lower.endsWith(` ${key}`))) {
            indicators.push(phrase.label);
        }
    }
    return Array.from(new Set(indicators));
}

function detectAccountFlags(author = {}) {
    const created = Number(author.createdTimestamp || 0);
    const ageMs = created ? Date.now() - created : null;
    const veryYoung = ageMs != null && ageMs < 24 * 60 * 60 * 1000;
    const young = ageMs != null && ageMs < 7 * 24 * 60 * 60 * 1000;
    const avatarMissing = !author.avatar;
    return { veryYoung, young, ageMs, avatarMissing };
}

function buildMessageSnapshot(message, config) {
    const content = String(message.content || '').slice(0, 600);
    const scamIndicators = detectSuspiciousTextIndicators(content);
    const account = detectAccountFlags(message.author || {});
    const attachments = extractAttachments(message, config);
    const imageAttachments = attachments.filter((att) => att.kind === 'image');
    const uniqueAttachmentFingerprints = new Set(attachments.map((att) => att.fingerprint));
    const uniqueImageFingerprints = new Set(imageAttachments.map((att) => att.fingerprint));
    return {
        id: message.id,
        userId: message.author.id,
        channelId: message.channelId,
        categoryId: message.channel?.parentId || null,
        timestamp: Number(message.createdTimestamp || Date.now()),
        content,
        normalizedContent: normalizeText(content),
        isReply: Boolean(message.reference?.messageId),
        replyToMessageId: message.reference?.messageId || null,
        replyToUserId: message.mentions?.repliedUser?.id || null,
        mentionsCount: Number(message.mentions?.users?.size || 0),
        uniqueMentionsUserIds: Array.from(message.mentions?.users?.keys?.() || []),
        everyoneMention: Boolean(message.mentions?.everyone),
        urls: extractUrls(content, config.maxUrlsPerMessage),
        attachments,
        suspiciousTextIndicators: scamIndicators,
        accountAgeMs: account.ageMs,
        accountVeryYoung: account.veryYoung,
        accountYoung: account.young,
        avatarMissing: account.avatarMissing,
        attachmentsCount: attachments.length,
        imageAttachmentsCount: imageAttachments.length,
        uniqueAttachmentFingerprintsCount: uniqueAttachmentFingerprints.size,
        uniqueImageFingerprintsCount: uniqueImageFingerprints.size
    };
}

module.exports = {
    clamp,
    normalizeText,
    similarity,
    extractUrls,
    detectSuspiciousTextIndicators,
    detectAccountFlags,
    buildMessageSnapshot
};
