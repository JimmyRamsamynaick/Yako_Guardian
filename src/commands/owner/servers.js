const { sendV2Message } = require('../../utils/componentUtils');
const { isBotOwner } = require('../../utils/ownerUtils');
const { PermissionsBitField, ChannelType } = require('discord.js');
const GlobalSettings = require('../../database/models/GlobalSettings');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'servers',
    description: 'Gestion des serveurs (Owner)',
    category: 'Owner',
    aliases: ['invite', 'leave', 'secur'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0];

        // --- SECUR INVITE ---
        if (commandName === 'secur' && sub === 'invite') {
            const state = args[1];
            if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                return sendV2Message(client, message.channel.id, await t('servers.usage_secur', message.guild.id), []);
            }

            const isEnabled = state.toLowerCase() === 'on';
            await GlobalSettings.findOneAndUpdate(
                { clientId: client.user.id },
                { securInvite: isEnabled },
                { upsert: true, new: true }
            );

            const statusStr = isEnabled ? await t('common.enabled', message.guild.id) : await t('common.disabled', message.guild.id);
            return sendV2Message(client, message.channel.id, await t('servers.secur_status', message.guild.id, { status: statusStr }), []);
        }

        // --- SERVER LIST ---
        if (commandName === 'servers' && (!sub || sub === 'list')) {
            const guilds = await Promise.all(client.guilds.cache.map(async g => 
                await t('servers.server_list_item', message.guild.id, { name: g.name, id: g.id, members: g.memberCount, ownerId: g.ownerId })
            ));
            
            // Pagination if needed, but for now simple join
            // Split into chunks if too long
            const chunks = [];
            let currentChunk = '';
            
            guilds.forEach(line => {
                if (currentChunk.length + line.length > 1900) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                currentChunk += line + '\n';
            });
            if (currentChunk) chunks.push(currentChunk);

            for (let i = 0; i < chunks.length; i++) {
                await sendV2Message(client, message.channel.id, await t('servers.server_list_title', message.guild.id, { count: client.guilds.cache.size, current: i+1, total: chunks.length, content: chunks[i] }), []);
            }
            return;
        }

        // --- INVITE ---
        if (commandName === 'invite') {
            const guildId = args[0];
            if (!guildId) return sendV2Message(client, message.channel.id, await t('servers.usage_invite', message.guild.id), []);

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return sendV2Message(client, message.channel.id, await t('servers.server_not_found', message.guild.id), []);

            try {
                // Try to find a channel to create invite
                const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite));
                
                if (!channel) return sendV2Message(client, message.channel.id, await t('servers.create_invite_error', message.guild.id), []);

                const invite = await channel.createInvite({ maxAge: 300, maxUses: 1, unique: true });
                return sendV2Message(client, message.channel.id, await t('servers.invite_success', message.guild.id, { guildName: guild.name, url: invite.url }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('servers.invite_error', message.guild.id, { error: e.message }), []);
            }
        }

        // --- LEAVE ---
        if (commandName === 'leave') {
            const guildId = args[0];
            if (!guildId) return sendV2Message(client, message.channel.id, await t('servers.usage_leave', message.guild.id), []);

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return sendV2Message(client, message.channel.id, await t('servers.server_not_found', message.guild.id), []);

            try {
                await guild.leave();
                return sendV2Message(client, message.channel.id, await t('servers.leave_success', message.guild.id, { guildName: guild.name }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('servers.leave_error', message.guild.id, { error: e.message }), []);
            }
        }
    }
};
