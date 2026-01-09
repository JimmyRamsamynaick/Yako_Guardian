const mongoose = require('mongoose');

const ActiveTicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Creator
    claimedBy: String,
    ticketType: { type: String, default: 'modmail' }, // 'modmail' or 'ticket'
    createdAt: { type: Date, default: Date.now },
    closed: { type: Boolean, default: false }
});

module.exports = mongoose.model('ActiveTicket', ActiveTicketSchema);
