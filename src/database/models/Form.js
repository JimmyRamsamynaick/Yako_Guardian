const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    guild_id: { type: String, required: true },
    form_id: { type: String, required: true },
    title: { type: String, required: true },
    questions: { type: [String], required: true }, // Array of question strings
    log_channel_id: { type: String, required: true }
});

module.exports = mongoose.model('Form', formSchema);