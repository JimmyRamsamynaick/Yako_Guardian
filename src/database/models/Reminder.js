const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true }, // Optional if DM
    channelId: { type: String },
    content: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', ReminderSchema);
