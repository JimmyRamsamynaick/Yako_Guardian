const mongoose = require('mongoose');

const ReputationSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    rep: { type: Number, default: 0 },
    lastRepTimestamp: { type: Number, default: 0 } // Cooldown
});

ReputationSchema.index({ guildId: 1, userId: 1 }, { unique: true });
ReputationSchema.index({ guildId: 1, rep: -1 }); // For leaderboard

module.exports = mongoose.model('Reputation', ReputationSchema);
