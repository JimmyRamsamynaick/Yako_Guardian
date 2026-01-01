const mongoose = require('mongoose');

const RoleMenuSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true }, // Internal name
    channelId: String,
    messageId: String,
    
    title: String,
    description: String,
    
    options: [{
        label: String,
        description: String,
        emoji: String,
        roleId: String,
        requiredRoles: [String] // IDs of roles required to pick this option
    }],
    
    type: { type: String, enum: ['select', 'button'], default: 'select' },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1 }
});

module.exports = mongoose.model('RoleMenu', RoleMenuSchema);
