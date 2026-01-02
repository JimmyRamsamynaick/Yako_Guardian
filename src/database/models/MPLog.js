const mongoose = require('mongoose');

const mpLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    content: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], required: true }, // 'in' = user->bot, 'out' = bot->user
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MPLog', mpLogSchema);
