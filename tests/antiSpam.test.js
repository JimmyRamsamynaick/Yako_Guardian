const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const { deepMerge, DEFAULT_ANTISPAM_CONFIG } = require('../src/antiSpam/SpamConfig');
const { SpamStore } = require('../src/antiSpam/SpamStore');
const { calculateSpamScore } = require('../src/antiSpam/SpamScorer');
const { shouldIgnoreMessage } = require('../src/antiSpam');

function config(overrides = {}) {
    return deepMerge(DEFAULT_ANTISPAM_CONFIG, overrides);
}

function snap({
    id,
    channelId = 'c1',
    content = '',
    timestamp,
    urls = [],
    attachments = [],
    isReply = false,
    mentionsCount = 0,
    suspiciousTextIndicators = []
}) {
    return {
        id,
        userId: 'u1',
        channelId,
        categoryId: null,
        content,
        normalizedContent: String(content).toLowerCase().replace(/\s+/g, ' ').trim(),
        timestamp,
        urls,
        attachments,
        isReply,
        mentionsCount,
        suspiciousTextIndicators
    };
}

function scoreFrom(messages, overrides = {}) {
    return calculateSpamScore(
        { currentScore: 0, lastActionAt: 0, lastActionLevel: 0, recentActions: [], messages },
        config(overrides)
    );
}

test('Test 1 - 2 messages normaux => no spam', () => {
    const now = Date.now();
    const result = scoreFrom([
        snap({ id: '1', content: 'Salut, tu arrives quand ?', timestamp: now - 2000 }),
        snap({ id: '2', content: 'Je finis ma game et j\'arrive.', timestamp: now })
    ]);
    assert.ok(result.score < 20);
});

test('Test 2 - 20 messages tres rapides => spam detected', () => {
    const now = Date.now();
    const messages = Array.from({ length: 20 }, (_, i) =>
        snap({ id: String(i), content: 'free nitro', timestamp: now - (20 - i) * 120 })
    );
    const result = scoreFrom(messages);
    assert.ok(result.score >= 60);
});

test('Test 3 - 10 utilisateurs x 3 messages => aucun flag global de salon', () => {
    const now = Date.now();
    for (let user = 0; user < 10; user++) {
        const result = scoreFrom([
            snap({ id: `${user}-1`, content: `salut ${user}`, timestamp: now - 3000 }),
            snap({ id: `${user}-2`, content: `ca va ${user}?`, timestamp: now - 1500 }),
            snap({ id: `${user}-3`, content: `ok merci ${user}`, timestamp: now })
        ]);
        assert.ok(result.score < 40);
    }
});

test('Test 4 - utilisateur rapide dans 5 salons avec contenu varie => no automatic spam', () => {
    const now = Date.now();
    const result = scoreFrom([
        snap({ id: '1', channelId: 'a', content: 'attendez', timestamp: now - 2200 }),
        snap({ id: '2', channelId: 'b', content: 'j\'arrive', timestamp: now - 1800 }),
        snap({ id: '3', channelId: 'c', content: 'mdr', timestamp: now - 1200 }),
        snap({ id: '4', channelId: 'd', content: 'vous en pensez quoi ?', timestamp: now - 700 }),
        snap({ id: '5', channelId: 'e', content: 'on lance ?', timestamp: now })
    ]);
    assert.ok(result.score < 40);
});

test('Test 5 - meme lien dans 5 salons => high spam score', () => {
    const now = Date.now();
    const link = { normalized: 'https://bad.example/free', domain: 'bad.example', isShortener: false };
    const result = scoreFrom([
        snap({ id: '1', channelId: 'a', content: 'clique', urls: [link], timestamp: now - 2000 }),
        snap({ id: '2', channelId: 'b', content: 'clique', urls: [link], timestamp: now - 1500 }),
        snap({ id: '3', channelId: 'c', content: 'clique', urls: [link], timestamp: now - 1000 }),
        snap({ id: '4', channelId: 'd', content: 'clique', urls: [link], timestamp: now - 500 }),
        snap({ id: '5', channelId: 'e', content: 'clique', urls: [link], timestamp: now })
    ]);
    assert.ok(result.score >= 80);
});

test('Test 6 - meme image repetee => high spam score', () => {
    const now = Date.now();
    const image = { fingerprint: 'image:proof.png:1000', kind: 'image' };
    const result = scoreFrom([
        snap({ id: '1', attachments: [image], timestamp: now - 1800 }),
        snap({ id: '2', attachments: [image], timestamp: now - 1200 }),
        snap({ id: '3', attachments: [image], timestamp: now - 600 }),
        snap({ id: '4', attachments: [image], timestamp: now })
    ]);
    assert.ok(result.score >= 60);
});

test('Test 7 - messages presque identiques => spam score increase', () => {
    const now = Date.now();
    const result = scoreFrom([
        snap({ id: '1', content: 'Clique ici maintenant', timestamp: now - 2000 }),
        snap({ id: '2', content: 'Clique ici maintenant !!!', timestamp: now - 1300 }),
        snap({ id: '3', content: 'Clique ici maintenant svp', timestamp: now - 600 }),
        snap({ id: '4', content: 'Clique ici maintenant !', timestamp: now })
    ]);
    assert.ok(result.score >= 40);
});

test('Test 8 - admin spam avec permission ignoree => ignored', () => {
    const fakeMessage = {
        guild: { id: 'g1' },
        author: { id: 'u1', bot: false },
        channelId: 'c1',
        channel: { parentId: null },
        member: {
            roles: { cache: { some: () => false } },
            permissions: { has: (flag) => flag === PermissionFlagsBits.Administrator }
        }
    };
    const ignored = shouldIgnoreMessage(fakeMessage, config());
    assert.equal(ignored, true);
});

test('Test 9 - score decays', () => {
    const store = new SpamStore();
    const antiConfig = config({ decayPerSecond: 1 });
    const state = store.getUserState('g1', 'u1');
    state.currentScore = 70;
    state.lastEvaluatedAt = Date.now() - 30000;
    store.applyDecay(state, antiConfig);
    assert.ok(state.currentScore < 70);
});

test('Test 10 - deux utilisateurs spamment en parallele => analyse independante', () => {
    const now = Date.now();
    const userA = scoreFrom(
        Array.from({ length: 8 }, (_, i) =>
            snap({ id: `a${i}`, content: 'spam', timestamp: now - (8 - i) * 150 })
        )
    );
    const userB = scoreFrom(
        Array.from({ length: 8 }, (_, i) =>
            snap({ id: `b${i}`, content: 'spam', timestamp: now - (8 - i) * 150 })
        )
    );
    assert.ok(userA.score >= 60);
    assert.ok(userB.score >= 60);
});

test('Test 11 - messages normaux rapides multi-salons => low risk', () => {
    const now = Date.now();
    const result = scoreFrom([
        snap({ id: '1', channelId: 'general', content: 'Regardez ca', timestamp: now - 1800 }),
        snap({ id: '2', channelId: 'media', content: 'Et ca aussi', timestamp: now - 1400 }),
        snap({ id: '3', channelId: 'discussion', content: 'Vous en pensez quoi ?', timestamp: now - 900 }),
        snap({ id: '4', channelId: 'general', content: 'mdr', timestamp: now })
    ]);
    assert.ok(result.score < 40);
});

test('Test 12 - diffusion cross-channel tres rapide du meme contenu => high risk', () => {
    const now = Date.now();
    const result = scoreFrom([
        snap({ id: '1', channelId: 'general', content: 'FREE NITRO', timestamp: now - 1500 }),
        snap({ id: '2', channelId: 'memes', content: 'FREE NITRO!!!', timestamp: now - 1100 }),
        snap({ id: '3', channelId: 'gaming', content: 'free nitro', timestamp: now - 700 }),
        snap({ id: '4', channelId: 'discussion', content: 'FREE  NITRO', timestamp: now - 300 }),
        snap({ id: '5', channelId: 'general', content: 'FREE NITRO', timestamp: now })
    ]);
    assert.ok(result.score >= 80);
});
