const { db } = require('../database');
const crypto = require('crypto');

function checkSubscription(guildId) {
    const sub = db.prepare('SELECT expires_at FROM subscriptions WHERE guild_id = ?').get(guildId);
    if (!sub) return false;
    return sub.expires_at > Date.now();
}

function getSubscription(guildId) {
    return db.prepare('SELECT expires_at FROM subscriptions WHERE guild_id = ?').get(guildId);
}

function generateKey(durationDays) {
    // Format: YAKO-XXXX-XXXX-XXXX
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
    const key = `YAKO-${randomPart}`;
    
    db.prepare('INSERT INTO license_keys (key_code, duration_days, created_at) VALUES (?, ?, ?)').run(
        key,
        durationDays,
        Date.now()
    );
    
    return key;
}

function redeemKey(guildId, keyCode) {
    const key = db.prepare('SELECT * FROM license_keys WHERE key_code = ?').get(keyCode);
    
    if (!key) return { success: false, message: "Clé invalide." };
    if (key.used_by) return { success: false, message: "Cette clé a déjà été utilisée." };
    
    const now = Date.now();
    const durationMs = key.duration_days * 24 * 60 * 60 * 1000;
    
    // Check existing sub
    let expiresAt = now + durationMs;
    const existingSub = db.prepare('SELECT expires_at FROM subscriptions WHERE guild_id = ?').get(guildId);
    
    if (existingSub && existingSub.expires_at > now) {
        // Extend existing subscription
        expiresAt = existingSub.expires_at + durationMs;
    }
    
    // Transaction
    const redeem = db.transaction(() => {
        db.prepare('UPDATE license_keys SET used_by = ?, used_at = ? WHERE key_code = ?').run(guildId, now, keyCode);
        db.prepare('INSERT OR REPLACE INTO subscriptions (guild_id, expires_at) VALUES (?, ?)').run(guildId, expiresAt);
    });
    
    try {
        redeem();
        return { success: true, expiresAt };
    } catch (error) {
        console.error("Redeem error:", error);
        return { success: false, message: "Erreur lors de l'activation." };
    }
}

module.exports = {
    checkSubscription,
    getSubscription,
    generateKey,
    redeemKey
};
