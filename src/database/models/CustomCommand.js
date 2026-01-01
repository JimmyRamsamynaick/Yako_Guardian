const mongoose = require('mongoose');

const CustomCommandSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true }, // The command name
    response: { type: String, required: true },
    embed: { type: Boolean, default: false }, // Deprecated per instruction, but kept for schema compat if needed. Instruction says "Aucun embed", so we will output text.
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique trigger per guild
CustomCommandSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

module.exports = mongoose.model('CustomCommand', CustomCommandSchema);
