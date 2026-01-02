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
    },

    // --- NEW MODERATION SYSTEM ---
    moderation: {
        muteRole: String,
        timeoutEnabled: { type: Boolean, default: true },
        
        antispam: {
            enabled: { type: Boolean, default: false },
            limit: { type: Number, default: 5 },
            time: { type: Number, default: 5000 },
            ignoredChannels: [String],
            ignoredRoles: [String]
        },

        antilink: {
            enabled: { type: Boolean, default: false },
            mode: { type: String, default: 'invite', enum: ['invite', 'all'] },
            ignoredChannels: [String],
            ignoredRoles: [String]
        },

        massmention: {
            enabled: { type: Boolean, default: false },
            limit: { type: Number, default: 5 },
            ignoredChannels: [String],
            ignoredRoles: [String]
        },

        badwords: {
            enabled: { type: Boolean, default: false },
            list: [String],
            ignoredChannels: [String],
            ignoredRoles: [String]
        },

        strikes: {
            seniorityThreshold: { type: Number, default: 604800000 }, // 7 days
            punishments: [{
                count: Number,
                action: { type: String, enum: ['kick', 'ban', 'mute', 'timeout', 'warn'] },
                duration: Number // ms
            }]
        },

        nodeRankRoles: [String],
        picOnlyChannels: [String]
    },

    // Public Channels (Generic "Public" mode, behavior defined by commands)
    public: {
        enabled: { type: Boolean, default: false },
        channels: [String]
    }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
