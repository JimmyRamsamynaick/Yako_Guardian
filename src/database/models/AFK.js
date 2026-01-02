const mongoose = require('mongoose');

const AFKSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, default: 'AFK' },
    timestamp: { type: Number, default: Date.now },
    mentions: [{
        user: String,
        content: String,
        timestamp: Number
    }]
});

AFKSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AFK', AFKSchema);
