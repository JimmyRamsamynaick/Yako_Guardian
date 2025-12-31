const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true },
    themeColor: { type: String, default: 'Blue' },
    language: { type: String, default: 'fr' },
    autoUpdate: { type: Boolean, default: false },
    activity: {
        type: { type: String, default: 'Custom' }, // Custom, Playing, etc.
        name: { type: String, default: 'Yako Guardian' }
    },
    status: { type: String, default: 'online' },
    securInvite: { type: Boolean, default: false },
    mpEnabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
