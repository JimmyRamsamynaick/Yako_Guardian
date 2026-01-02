const mongoose = require('mongoose');

const UserStrikeSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    strikes: [{
        reason: String,
        moderatorId: String,
        timestamp: { type: Date, default: Date.now },
        type: { type: String, default: 'manual' } // 'antispam', 'badwords', 'manual'
    }]
});

module.exports = mongoose.model('UserStrike', UserStrikeSchema);
