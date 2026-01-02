const { ChannelType, PermissionsBitField } = require('discord.js');
const Backup = require('../database/models/Backup');

async function createBackup(guild, name) {
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
                position: role.position // We might need to recalculate positions
            });
        });

    // Channels
    // We need to handle categories first, then children
    const categories = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);
    
    const others = guild.channels.cache
        .filter(c => c.type !== ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);

    // Helper to serialize channel
    const serializeChannel = (c) => ({
        name: c.name,
        type: c.type,
        parent: c.parent ? c.parent.name : null,
        permissionOverwrites: c.permissionOverwrites.cache.map(p => {
            const role = guild.roles.cache.get(p.id);
            const member = guild.members.cache.get(p.id);
            return {
                id: role ? role.name : (member ? member.id : p.id), // Store by name for roles to map later
                type: p.type,
                allow: p.allow.bitfield.toString(),
                deny: p.deny.bitfield.toString()
            };
        }),
        topic: c.topic,
        nsfw: c.nsfw,
        rateLimitPerUser: c.rateLimitPerUser,
        bitrate: c.bitrate,
        userLimit: c.userLimit
    });

    [...categories.values(), ...others.values()].forEach(c => {
        backupData.channels.push(serializeChannel(c));
    });

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

    const data = backupDoc.data;

    // 1. Clear Guild
    // Delete roles (except everyone/managed/bot)
    // Dangerous!
    // For safety, let's just create new ones or try to match.
    // Standard backup load usually wipes.
    
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
    
    // We reverse to create from bottom to top? Or top to bottom?
    // Roles need to be created.
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
    // First Categories
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

module.exports = { createBackup, loadBackup };