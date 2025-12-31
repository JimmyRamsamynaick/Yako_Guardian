const mongoose = require('mongoose');

const botOwnerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BotOwner', botOwnerSchema);
