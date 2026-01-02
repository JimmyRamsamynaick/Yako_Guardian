const mongoose = require('mongoose');

const serverBlacklistSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    reason: { type: String, default: 'No reason provided' },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerBlacklist', serverBlacklistSchema);
