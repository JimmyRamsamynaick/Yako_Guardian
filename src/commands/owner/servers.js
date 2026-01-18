const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const { PermissionsBitField, ChannelType } = require('discord.js');
const GlobalSettings = require('../../database/models/GlobalSettings');
const ServerBlacklist = require('../../database/models/ServerBlacklist');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'servers',
    description: 'Gestion des serveurs (Owner)',
    category: 'Owner',
    aliases: ['invite', 'leave', 'server'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0]?.toLowerCase();

        // --- SECUR INVITE (Moved to security.js) ---
        /*
        if (commandName === 'secur' && sub === 'invite') {
            const state = args[1];
            if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.usage_secur', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const isEnabled = state.toLowerCase() === 'on';
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { securInvite: isEnabled },
                { upsert: true, new: true }
            );

            const statusStr = isEnabled ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
            return message.channel.send({ embeds: [createEmbed(
                await t('servers.secur_status', message.guild.id, { status: statusStr }),
                '',
                'success'
            )] });
        }
        */

        // --- SERVER LIST ---
        if (commandName === 'servers' && (!sub || sub === 'list')) {
            const guilds = await Promise.all(client.guilds.cache.map(async g => 
                await t('servers.server_list_item', message.guild.id, { name: g.name, id: g.id, members: g.memberCount, ownerId: g.ownerId })
            ));
            
            const chunks = [];
            let currentChunk = '';
            
            guilds.forEach(line => {
                if (currentChunk.length + line.length > 3800) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                currentChunk += line + '\n';
            });
            if (currentChunk) chunks.push(currentChunk);

            for (let i = 0; i < chunks.length; i++) {
                // Sending as Embed
                const title = await t('servers.server_list_title', message.guild.id, { count: client.guilds.cache.size, current: i+1, total: chunks.length });
                await message.channel.send({ embeds: [createEmbed(title, chunks[i], 'default')] });
            }
            return;
        }

        // --- +SERVER COMMANDS ---
        if (commandName === 'server') {
            // +server info <ID>
            if (sub === 'info') {
                const guildId = args[1];
                if (!guildId) return message.channel.send({ embeds: [createEmbed(
                    await t('servers.usage_info', message.guild.id),
                    '',
                    'error'
                )] });
                
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return message.channel.send({ embeds: [createEmbed(
                    await t('servers.server_not_found', message.guild.id),
                    '',
                    'error'
                )] });

                const owner = await guild.fetchOwner().catch(() => null);
                
                const embed = createEmbed(
                    await t('servers.info_title', message.guild.id, { name: guild.name }),
                    '',
                    'default'
                )
                    .setThumbnail(guild.iconURL())
                    .addFields(
                        { name: 'ID', value: guild.id, inline: true },
                        { name: await t('servers.info_owner', message.guild.id), value: owner ? `${owner.user.tag} (${owner.id})` : 'Unknown', inline: true },
                        { name: await t('servers.info_members', message.guild.id), value: `${guild.memberCount}`, inline: true },
                        { name: await t('servers.info_created', message.guild.id), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: await t('servers.info_joined', message.guild.id), value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:R>`, inline: true },
                        { name: await t('servers.info_channels', message.guild.id), value: `${guild.channels.cache.size}`, inline: true }
                    );

                return message.channel.send({ embeds: [embed] });
            }

            // +server stats
            if (sub === 'stats') {
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor(uptime / 3600) % 24;
                const minutes = Math.floor(uptime / 60) % 60;
                const seconds = Math.floor(uptime % 60);

                const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

                const embed = createEmbed(await t('servers.stats_title', message.guild.id), '', 'info')
                    .addFields(
                        { name: await t('servers.stats_guilds', message.guild.id), value: `${client.guilds.cache.size}`, inline: true },
                        { name: await t('servers.stats_users', message.guild.id), value: `${client.users.cache.size}`, inline: true },
                        { name: await t('servers.stats_uptime', message.guild.id), value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                        { name: await t('servers.stats_ram', message.guild.id), value: `${ram} MB`, inline: true }
                    );

                return message.channel.send({ embeds: [embed] });
            }

            // +server blacklist <add/del> <ID>
            if (sub === 'blacklist') {
                const action = args[1]?.toLowerCase();
                const guildId = args[2];
                
                if (!['add', 'del'].includes(action) || !guildId) {
                    return message.channel.send({ embeds: [createEmbed(
                        await t('servers.usage_blacklist', message.guild.id),
                        '',
                        'error'
                    )] });
                }

                if (action === 'add') {
                    await ServerBlacklist.create({ guildId, addedAt: new Date() }).catch(() => {});
                    // Optional: Leave if currently in it?
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) await guild.leave().catch(() => {});
                    
                    return message.channel.send({ embeds: [createEmbed(
                        await t('servers.blacklist_added', message.guild.id, { id: guildId }),
                        '',
                        'success'
                    )] });
                } else {
                    await ServerBlacklist.deleteOne({ guildId });
                    return message.channel.send({ embeds: [createEmbed(
                        await t('servers.blacklist_removed', message.guild.id, { id: guildId }),
                        '',
                        'success'
                    )] });
                }
            }

            // +server owner (Get owner info of server)
            if (sub === 'owner') {
                 const ownerId = args[1];
                 if (ownerId) {
                     const ownedGuilds = client.guilds.cache.filter(g => g.ownerId === ownerId);
                     const list = ownedGuilds.map(g => `${g.name} (${g.id})`).join('\n') || 'None';
                     return message.channel.send({ embeds: [createEmbed(
                         `**Servers owned by ${ownerId}:**\n${list}`,
                         '',
                         'info'
                     )] });
                 }
                 return message.channel.send({ embeds: [createEmbed(
                     "Usage: `+server owner <OwnerID>`",
                     '',
                     'info'
                 )] });
            }
        }

        // --- INVITE ---
        if (commandName === 'invite') {
            const guildId = args[0];
            if (!guildId) return message.channel.send({ embeds: [createEmbed(
                await t('servers.usage_invite', message.guild.id),
                '',
                'error'
            )] });

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return message.channel.send({ embeds: [createEmbed(
                await t('servers.server_not_found', message.guild.id),
                '',
                'error'
            )] });

            try {
                // Try to find a channel to create invite
                const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite));
                
                if (!channel) return message.channel.send({ embeds: [createEmbed(
                    await t('servers.create_invite_error', message.guild.id),
                    '',
                    'error'
                )] });

                const invite = await channel.createInvite({ maxAge: 300, maxUses: 1, unique: true });
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.invite_success', message.guild.id, { guildName: guild.name, url: invite.url }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.invite_error', message.guild.id, { error: e.message }),
                    '',
                    'error'
                )] });
            }
        }

        // --- LEAVE ---
        if (commandName === 'leave') {
            const guildId = args[0];
            if (!guildId) return message.channel.send({ embeds: [createEmbed(
                await t('servers.usage_leave', message.guild.id),
                '',
                'error'
            )] });

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return message.channel.send({ embeds: [createEmbed(
                await t('servers.server_not_found', message.guild.id),
                '',
                'error'
            )] });

            try {
                await guild.leave();
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.leave_success', message.guild.id, { guildName: guild.name }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('servers.leave_error', message.guild.id, { error: e.message }),
                    '',
                    'error'
                )] });
            }
        }
    }
};
