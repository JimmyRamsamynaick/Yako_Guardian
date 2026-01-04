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
        dm: { type: Boolean, default: false },
        roleId: String
    },
    goodbye: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        message: String
    },

    // Security
    security: {
        captcha: {
            enabled: { type: Boolean, default: false },
            difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
            roleId: String, // Role given AFTER captcha
            bypassRoles: [String]
        },
        antibot: { type: Boolean, default: false },
        antiflood: { // Join flood
            enabled: { type: Boolean, default: false },
            limit: { type: Number, default: 5 },
            time: { type: Number, default: 10000 } // 10s
        }
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

    // Boost Embed
    boost: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        message: String, // Custom message content (outside embed)
        title: String, // Custom embed title
        description: String, // Custom embed description
        image: String, // Custom image URL (GIF/PNG...)
        thumbnail: String, // Custom thumbnail URL
        embed: { type: Object, default: {} } // Custom embed structure if needed
    },

    // Suggestions
    suggestion: {
        enabled: { type: Boolean, default: false },
        channelId: String
    },

    // --- NEW MODERATION SYSTEM ---
    moderation: {
        logChannel: String,
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
    },

    // Automations
    automations: {
        autorole: {
            enabled: { type: Boolean, default: false },
            roleId: String,
            botRoleId: String
        },
        autonick: {
            enabled: { type: Boolean, default: false },
            format: String
        },
        autothread: {
            enabled: { type: Boolean, default: false },
            channels: [String]
        },
        autoslowmode: {
            enabled: { type: Boolean, default: false },
            limit: Number,
            time: Number,
            duration: Number
        }
    },

    // Community
    community: {
        levels: {
            enabled: { type: Boolean, default: false },
            channelId: String,
            message: String
        },
        rep: {
            enabled: { type: Boolean, default: false }
        }
    },
    
    clearLimit: { type: Number, default: 100 },

    // Advanced Logs
    logs: {
        mod: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        message: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        voice: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        boost: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        role: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        raid: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        server: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] },
        member: { enabled: { type: Boolean, default: false }, channelId: String, ignoredUsers: [String], ignoredRoles: [String] }
    }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
