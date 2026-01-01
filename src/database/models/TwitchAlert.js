const mongoose = require('mongoose');

const TwitchAlertSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelName: { type: String, required: true },
    discordChannelId: { type: String, required: true },
    message: { type: String, default: "{streamer} est en live ! {link}" },
    lastStreamId: String
});

module.exports = mongoose.model('TwitchAlert', TwitchAlertSchema);
