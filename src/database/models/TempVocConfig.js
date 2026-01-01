const mongoose = require('mongoose');

const TempVocConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    hubChannelId: { type: String, required: true },
    categoryId: { type: String, required: true },
    channelName: { type: String, default: "Salon de {username}" }
});

module.exports = mongoose.model('TempVocConfig', TempVocConfigSchema);
