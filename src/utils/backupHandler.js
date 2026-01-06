const { ChannelType, PermissionsBitField } = require('discord.js');
const Backup = require('../database/models/Backup');
const { t } = require('./i18n');

// Helper to serialize channel
const serializeChannel = (c, guild) => {
    try {
        const perms = (c.permissionOverwrites && c.permissionOverwrites.cache) ? c.permissionOverwrites.cache.map(p => {
            const role = guild.roles.cache.get(p.id);
            const member = guild.members.cache.get(p.id);
            return {
                id: role ? role.name : (member ? member.id : p.id), // Store by name for roles to map later
                type: p.type,
                allow: p.allow.bitfield.toString(),
                deny: p.deny.bitfield.toString()
            };
        }) : [];

        return {
            name: c.name,
            type: c.type,
            parent: c.parent ? c.parent.name : null,
            permissionOverwrites: perms,
            topic: c.topic,
            nsfw: c.nsfw,
            rateLimitPerUser: c.rateLimitPerUser,
            bitrate: c.bitrate,
            userLimit: c.userLimit
        };
    } catch (error) {
        console.error(`Error serializing channel ${c.name} (${c.id}):`, error);
        return null;
    }
};

// Helper to map permissions during restore
function mapPermissions(overwrites, roleMap, guild) {
    if (!overwrites) return [];
    return overwrites.map(o => {
        let id;
        if (o.type === 0) { // Role
            id = roleMap.get(o.id) || guild.roles.everyone.id; // Fallback
        } else { // Member
            id = o.id; // Keep ID (might not exist)
        }
        return {
            id: id,
            allow: BigInt(o.allow),
            deny: BigInt(o.deny)
        };
    });
}

async function getBackupData(guild) {
    const backupData = {
        name: guild.name,
        icon: guild.iconURL(),
        roles: [],
        channels: []
    };

    // Roles (excluding @everyone and managed roles)
    guild.roles.cache
        .filter(r => !r.managed && r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .forEach(role => {
            backupData.roles.push({
                name: role.name,
                color: role.hexColor,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString(),
                mentionable: role.mentionable,
                position: role.position
            });
        });

    // Channels
    const categories = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);
    
    const others = guild.channels.cache
        .filter(c => c.type !== ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);

    [...categories.values(), ...others.values()].forEach(c => {
        const serialized = serializeChannel(c, guild);
        if (serialized) backupData.channels.push(serialized);
    });

    return backupData;
}

async function applyBackupData(guild, data) {
    // 1. Clear Guild
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
        throw new Error('Missing Administrator permission');
    }

    // Nuke Channels
    await Promise.all(guild.channels.cache.map(c => c.delete().catch(() => {})));

    // Nuke Roles (careful with bot role)
    await Promise.all(guild.roles.cache
        .filter(r => !r.managed && r.name !== '@everyone' && r.position < botMember.roles.highest.position)
        .map(r => r.delete().catch(() => {}))
    );

    // Update Guild Info
    if (data.name) await guild.setName(data.name).catch(() => {});
    if (data.icon) await guild.setIcon(data.icon).catch(() => {});

    // Restore Roles
    const roleMap = new Map(); // Old Name -> New ID
    
    for (const roleData of data.roles) {
        const newRole = await guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            hoist: roleData.hoist,
            permissions: BigInt(roleData.permissions),
            mentionable: roleData.mentionable,
            reason: await t('backup.reason_load', guild.id)
        }).catch(() => null);
        
        if (newRole) roleMap.set(roleData.name, newRole.id);
    }

    // Restore Channels
    const categories = data.channels.filter(c => c.type === ChannelType.GuildCategory);
    const others = data.channels.filter(c => c.type !== ChannelType.GuildCategory);

    for (const cData of categories) {
        await guild.channels.create({
            name: cData.name,
            type: cData.type,
            permissionOverwrites: mapPermissions(cData.permissionOverwrites, roleMap, guild)
        }).catch(() => {});
    }

    for (const cData of others) {
        const parent = cData.parent ? guild.channels.cache.find(c => c.name === cData.parent && c.type === ChannelType.GuildCategory) : null;
        await guild.channels.create({
            name: cData.name,
            type: cData.type,
            parent: parent ? parent.id : null,
            topic: cData.topic,
            nsfw: cData.nsfw,
            rateLimitPerUser: cData.rateLimitPerUser,
            bitrate: cData.bitrate,
            userLimit: cData.userLimit,
            permissionOverwrites: mapPermissions(cData.permissionOverwrites, roleMap, guild)
        }).catch(() => {});
    }
}

async function createBackup(guild, name) {
    const backupData = await getBackupData(guild);
    
    // Save to DB
    await Backup.findOneAndUpdate(
        { guild_id: guild.id, name: name },
        { data: backupData, created_at: Date.now() },
        { upsert: true, new: true }
    );

    return true;
}

async function loadBackup(guild, name) {
    const backupDoc = await Backup.findOne({ guild_id: guild.id, name: name });
    if (!backupDoc) throw new Error('Backup not found');
    await applyBackupData(guild, backupDoc.data);
}

module.exports = { createBackup, loadBackup, getBackupData, applyBackupData };