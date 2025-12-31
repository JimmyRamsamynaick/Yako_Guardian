const mongoose = require('mongoose');

const autoReactSchema = new mongoose.Schema({
    guild_id: { type: String, required: true },
    channel_id: { type: String, required: true },
    emojis: { type: [String], default: [] }
});

module.exports = mongoose.model('AutoReact', autoReactSchema);