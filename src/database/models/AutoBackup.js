const mongoose = require('mongoose');

const autoBackupSchema = new mongoose.Schema({
    guild_id: { type: String, required: true },
    frequency_days: { type: Number, required: true },
    last_backup: { type: Date, default: null },
    next_backup: { type: Date, required: true }
});

module.exports = mongoose.model('AutoBackup', autoBackupSchema);