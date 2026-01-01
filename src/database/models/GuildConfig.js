const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '+' },
    
    // Auto Publish
    autoPublish: { type: Boolean, default: false },
    autoPublishChannels: [String],

    // Soutien
    soutien: {
        enabled: { type: Boolean, default: false },
        roleId: String,
        statusText: String
    },

    // Twitch
    twitch: {
        enabled: { type: Boolean, default: false },
        notificationChannelId: String
    },

    // Join/Leave
    welcome: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        message: String, // Type 17 text
        // image: String // Type 17 media
    },
    goodbye: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        message: String
    },

    // Autodelete
    autodelete: {
        moderation: {
            command: { type: Boolean, default: false },
            response: { type: Number, default: 0 } // 0 = no delete, >0 = delay in ms
        },
        snipe: {
            command: { type: Boolean, default: false },
            response: { type: Number, default: 0 }
        }
    },

    // Permissions Custom
    customPermissions: [{
        command: String,
        roleId: String,
        userId: String,
        allowed: Boolean
    }],

    // Permission Levels (1-5)
    permissionLevels: {
        type: Object,
        default: {
            '1': [],
            '2': [],
            '3': [],
            '4': [],
            '5': []
        }
    },

    // Modmail
    modmail: {
        enabled: { type: Boolean, default: false },
        categoryId: String,
        staffRoleId: String
    },

    // Reports
    report: {
        enabled: { type: Boolean, default: false },
        channelId: String
    },

    // PFP (Show Pics)
    pfp: {
        enabled: { type: Boolean, default: false },
        channelId: String
    },

    // Suggestions
    suggestion: {
        enabled: { type: Boolean, default: false },
        channelId: String
    }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
