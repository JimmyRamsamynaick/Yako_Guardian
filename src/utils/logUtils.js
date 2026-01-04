const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const { getGuildConfig } = require('./mongoUtils');
const { t } = require('./i18n');
const { THEME } = require('./design');

// Mapping events to log types
const EVENT_TYPE_MAP = {
    // Message
    'messageDelete': 'message',
    'messageUpdate': 'message',
    'messageDeleteBulk': 'message',
    
    // Voice
    'voiceStateUpdate': 'voice',
    
    // Role
    'roleCreate': 'role',
    'roleDelete': 'role',
    'roleUpdate': 'role',
    
    // Mod (Usually triggered by commands, but also events)
    'guildBanAdd': 'mod',
    'guildBanRemove': 'mod',
    
    // Server (New)
    'channelCreate': 'server',
    'channelDelete': 'server',
    'channelUpdate': 'server',
    'emojiCreate': 'server',
    'emojiDelete': 'server',
    'emojiUpdate': 'server',
    'stickerCreate': 'server',
    'stickerDelete': 'server',
    'stickerUpdate': 'server',
    'guildUpdate': 'server',
    'webhookUpdate': 'server',
    'threadCreate': 'server',
    'threadDelete': 'server',
    'threadUpdate': 'server',
    'inviteCreate': 'server',
    'inviteDelete': 'server',
    
    // Member (New)
    'guildMemberAdd': 'member',
    'guildMemberRemove': 'member',
    'guildMemberUpdate': 'member',
    'userUpdate': 'member'
};

const LOG_COLORS = {
    mod: '#FF0000',     // Red
    message: '#3498DB', // Blue
    voice: '#2ECC71',   // Green
    role: '#F1C40F',    // Yellow
    server: '#9B59B6',  // Purple
    member: '#E67E22',  // Orange
    raid: '#E74C3C'     // Dark Red
};

async function sendLog(guild, eventName, data) {
    if (!guild) return;
    
    const config = await getGuildConfig(guild.id);
    if (!config || !config.logs) return;

    const type = EVENT_TYPE_MAP[eventName];
    if (!type) return; // Unknown event type

    const logConfig = config.logs[type];
    if (!logConfig || !logConfig.enabled || !logConfig.channelId) return;

    // Check Ignores
    if (data.executor) {
        if (logConfig.ignoredUsers && logConfig.ignoredUsers.includes(data.executor.id)) return;
        if (logConfig.ignoredRoles && data.executor.roles && data.executor.roles.cache.hasAny(...logConfig.ignoredRoles)) return;
    }
    if (data.author) {
        if (logConfig.ignoredUsers && logConfig.ignoredUsers.includes(data.author.id)) return;
    }
    if (data.channel) {
        // If channel specific ignores exist (not currently in schema but good to have)
    }

    const logChannel = guild.channels.cache.get(logConfig.channelId);
    if (!logChannel) return;

    // Construct Embed
    const embed = new EmbedBuilder()
        .setColor(LOG_COLORS[type] || THEME.colors.primary)
        .setTimestamp();

    // Localize title and fields
    const titleKey = `logs.${eventName}_title`;
    const title = await t(titleKey, guild.id);
    
    embed.setTitle(title !== titleKey ? title : `${type.toUpperCase()} - ${eventName}`);

    if (data.description) embed.setDescription(data.description);
    if (data.fields) embed.addFields(data.fields);
    if (data.footer) embed.setFooter({ text: data.footer });
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.image) embed.setImage(data.image);
    if (data.authorUser) {
        embed.setAuthor({ 
            name: `${data.authorUser.tag} (${data.authorUser.id})`, 
            iconURL: data.authorUser.displayAvatarURL({ dynamic: true }) 
        });
    }

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (e) {
        console.error(`Failed to send log to channel ${logConfig.channelId} in guild ${guild.id}:`, e);
    }
}

module.exports = { sendLog, EVENT_TYPE_MAP };
