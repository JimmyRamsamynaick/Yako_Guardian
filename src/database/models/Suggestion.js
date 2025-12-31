const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    messageId: { type: String }, 
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voters: [{ 
        userId: String, 
        vote: String // 'up' or 'down'
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Suggestion', suggestionSchema);