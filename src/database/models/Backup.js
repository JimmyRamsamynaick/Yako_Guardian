const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
    guild_id: { type: String, required: true },
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    data: {
        name: String,
        icon: String,
        channels: Array,
        roles: Array,
        bans: Array,
        emojis: Array
    }
});

// Composite index to ensure unique backup names per guild
BackupSchema.index({ guild_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Backup', BackupSchema);