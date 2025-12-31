const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
    guild_id: { type: String, required: true },
    user_id: { type: String, required: true },
    role_id: { type: String, required: true },
    expires_at: { type: Date, required: true }
});

module.exports = mongoose.model('TempRole', tempRoleSchema);