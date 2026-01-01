const mongoose = require('mongoose');
const ActiveTempVocSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    ownerId: String,
    allowedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ActiveTempVoc', ActiveTempVocSchema);
