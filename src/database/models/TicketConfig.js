const mongoose = require('mongoose');

const TicketConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    categoryId: String,
    transcriptChannelId: String,
    staffRoles: [String],
    
    // Panel settings
    panelTitle: String,
    panelDescription: String,
    buttonLabel: { type: String, default: 'Ouvrir un ticket' },
    buttonEmoji: { type: String, default: '📩' },
    
    // Ticket settings
    namingScheme: { type: String, default: 'ticket-{username}' }, // or ticket-{count}
    ticketCount: { type: Number, default: 0 },

    // Advanced features
    categories: [{
        label: String,
        emoji: String,
        style: String, // Primary, Secondary, Danger, Success
        description: String,
        categoryId: String, // Parent Category ID
        staffRoles: [String],
        welcomeMessage: String
    }]
});

module.exports = mongoose.model('TicketConfig', TicketConfigSchema);
