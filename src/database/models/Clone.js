const mongoose = require('mongoose');

const CloneSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
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

module.exports = mongoose.model('Clone', CloneSchema);