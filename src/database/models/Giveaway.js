const mongoose = require('mongoose');

const GiveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    hostId: { type: String, required: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    endTimestamp: { type: Number, required: true },
    ended: { type: Boolean, default: false },
    winners: [String]
});

module.exports = mongoose.model('Giveaway', GiveawaySchema);