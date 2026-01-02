const mongoose = require('mongoose');

const LevelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    lastMessageTimestamp: { type: Number, default: 0 }
});

LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
LevelSchema.index({ guildId: 1, xp: -1 }); // For leaderboard

module.exports = mongoose.model('Level', LevelSchema);
