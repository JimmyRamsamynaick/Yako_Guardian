const mongoose = require('mongoose');

const mpBlockSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    reason: { type: String, default: 'No reason provided' },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MPBlock', mpBlockSchema);
