const mongoose = require('mongoose');

const globalBlacklistSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    reason: { type: String, default: 'No reason provided' },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GlobalBlacklist', globalBlacklistSchema);
