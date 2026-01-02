const mongoose = require('mongoose');

const SanctionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    type: { type: String, required: true, enum: ['warn', 'mute', 'tempmute', 'kick', 'ban', 'tempban', 'unban', 'unmute', 'cmute', 'tempcmute', 'uncmute'] },
    reason: { type: String, default: 'Aucune raison fournie' },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number, default: null }, // Duration in ms for temp actions
    expiresAt: { type: Date, default: null }, // Expiry date for temp actions
    active: { type: Boolean, default: true }, // For temp actions, false when expired/revoked
    channelId: { type: String, default: null }, // For channel-specific sanctions (cmute)
    caseId: { type: Number, required: true }
});

SanctionSchema.index({ guildId: 1, userId: 1 });
SanctionSchema.index({ guildId: 1, caseId: 1 });

module.exports = mongoose.model('Sanction', SanctionSchema);
