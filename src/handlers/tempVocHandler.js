const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    StringSelectMenuBuilder, 
    UserSelectMenuBuilder, 
    PermissionsBitField,
    userMention
} = require('discord.js');
const ActiveTempVoc = require('../database/models/ActiveTempVoc');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function handleTempVocInteraction(client, interaction) {
    try {
        if (!interaction.guild) return;
        const { customId, member, guild, channel } = interaction;
        const guildId = guild.id;
        
        // Check if channel is temp voc
        const active = await ActiveTempVoc.findOne({ channelId: channel.id });
        if (!active) {
            return interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.not_temp_voc', guildId), '', 'error')], ephemeral: true });
        }

        if (active.ownerId !== member.id) {
            return interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.not_owner', guildId), '', 'error')], ephemeral: true });
        }

        // We defer immediately unless it's a modal trigger, modal submission, or a select menu that needs update()
        const noDefer = [
            'tempvoc_limit', 'tempvoc_rename', 
            'tempvoc_modal_limit', 'tempvoc_modal_rename',
            'tempvoc_select_kick', 'tempvoc_select_transfer', 'tempvoc_select_wl', 'tempvoc_select_bl'
        ];
        
        if (!noDefer.includes(customId)) {
            await interaction.deferReply({ ephemeral: true });
        }

        // --- BUTTONS ---

        if (customId === 'tempvoc_lock') {
            // Lock: Visible but Locked
            const everyone = guild.roles.everyone;
            const canConnect = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect);
            
            if (!canConnect || channel.name.startsWith('🔒')) {
                return interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.already_locked', guildId), '', 'error')] });
            }

            // 1. Rename channel to include the lock emoji
            if (!channel.name.startsWith('🔒')) {
                await channel.setName(`🔒-${channel.name}`).catch(() => {});
            }

            // 2. Lock permissions for everyone
            // We keep ViewChannel: true if it was already true, or let it follow @everyone default
            await channel.permissionOverwrites.edit(guild.id, { Connect: false });
            
            // 3. Ensure Whitelist (Database) keeps access
            for (const userId of active.allowedUsers) {
                await channel.permissionOverwrites.edit(userId, { 
                    Connect: true,
                    ViewChannel: true
                }).catch(() => {});
            }

            // 4. Ensure Bot keeps access
            await channel.permissionOverwrites.edit(client.user.id, {
                Connect: true,
                ViewChannel: true,
                ManageChannels: true
            }).catch(() => {});

            // 5. Allow members already in the channel to send messages (interface vocale)
            const membersInChannel = channel.members;
            for (const [memberId, m] of membersInChannel) {
                if (memberId !== member.id && !active.allowedUsers.includes(memberId)) {
                    await channel.permissionOverwrites.edit(memberId, { 
                        SendMessages: true,
                        ViewChannel: true
                    }).catch(() => {});
                }
            }

            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.locked', guildId), '', 'success')] });
        }
        else if (customId === 'tempvoc_unlock') {
            const everyone = guild.roles.everyone;
            const canConnect = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.Connect);
            
            if (canConnect && !channel.name.startsWith('🔒')) {
                return interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.already_unlocked', guildId), '', 'error')] });
            }

            // 1. Remove lock emoji from name
            let newName = channel.name;
            if (newName.startsWith('🔒-')) newName = newName.replace('🔒-', '');
            else if (newName.startsWith('🔒')) newName = newName.replace('🔒', '');
            
            if (newName !== channel.name) {
                await channel.setName(newName).catch(() => {});
            }

            // 2. Restore permissions for everyone
            await channel.permissionOverwrites.edit(guild.id, { Connect: true });

            // 3. Remove specific overwrites added during lock for members who are not Whitelisted/Owner
            const overwrites = channel.permissionOverwrites.cache;
            for (const [id, overwrite] of overwrites) {
                if (id !== guild.id && id !== member.id && id !== client.user.id && !active.allowedUsers.includes(id)) {
                    await channel.permissionOverwrites.delete(id).catch(() => {});
                }
            }

            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.unlocked', guildId), '', 'success')] });
        }
        else if (customId === 'tempvoc_hide') {
            // Toggle hide/unhide
            const everyone = guild.roles.everyone;
            const current = channel.permissionsFor(everyone).has(PermissionsBitField.Flags.ViewChannel);
            
            console.log(`[TempVoc] Hide/Show: Channel=${channel.id}, Current ViewChannel=${current}`);

            // 1. Ensure Bot and Owner have explicit access BEFORE changing @everyone
            // This prevents the bot from locking itself out
            await channel.permissionOverwrites.edit(client.user.id, { 
                ViewChannel: true, 
                Connect: true, 
                ManageChannels: true 
            });
            
            await channel.permissionOverwrites.edit(member.id, { 
                ViewChannel: true, 
                Connect: true, 
                ManageChannels: true,
                MoveMembers: true
            });

            // 2. Now toggle @everyone
            // If current is TRUE (Visible), we want to HIDE (False)
            // If current is FALSE (Hidden), we want to SHOW (True)
            const newStatus = !current;
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: newStatus });
            
            await interaction.editReply({ embeds: [createEmbed(newStatus ? await t('tempvoc.handler.visible', guildId) : await t('tempvoc.handler.hidden', guildId), '', 'success')] });
        }
        else if (customId === 'tempvoc_purge') {
            const members = channel.members.filter(m => m.id !== member.id);
            if (members.size === 0) return interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.purge_none', guildId), '', 'error')] });
            
            for (const [id, m] of members) {
                if (m.voice) await m.voice.disconnect("Purge").catch(() => {});
            }
            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.purge_success', guildId, { count: members.size }), '', 'success')] });
        }
        else if (customId === 'tempvoc_transfer') {
            const members = channel.members.filter(m => m.id !== member.id);
            if (members.size === 0) return interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.transfer_none', guildId), '', 'error')] });

            const select = new StringSelectMenuBuilder()
                .setCustomId('tempvoc_select_transfer')
                .setPlaceholder(await t('tempvoc.handler.transfer_select_placeholder', guildId))
                .addOptions(members.map(m => ({
                    label: m.user.tag,
                    value: m.id
                })));
            
            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.transfer_msg', guildId), '', 'info')], components: [new ActionRowBuilder().addComponents(select)] });
        }
        else if (customId === 'tempvoc_wl') {
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('tempvoc_select_wl')
                .setPlaceholder(await t('tempvoc.handler.wl_select_placeholder', guildId))
                .setMinValues(1)
                .setMaxValues(10);

            const wlNames = [];
            for (const id of active.allowedUsers) {
                const u = await client.users.fetch(id).catch(() => null);
                wlNames.push(u ? `**${u.username}**` : id);
            }
            const currentWL = wlNames.length > 0 ? wlNames.join(', ') : await t('tempvoc.handler.none', guildId);

            await interaction.editReply({ 
                embeds: [createEmbed(await t('tempvoc.handler.wl_current', guildId, { list: currentWL }), '', 'info')], 
                components: [new ActionRowBuilder().addComponents(userSelect)]
            });
        }
        else if (customId === 'tempvoc_bl') {
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('tempvoc_select_bl')
                .setPlaceholder(await t('tempvoc.handler.bl_select_placeholder', guildId))
                .setMinValues(1)
                .setMaxValues(10);

            const blNames = [];
            for (const id of active.blockedUsers) {
                const u = await client.users.fetch(id).catch(() => null);
                blNames.push(u ? `**${u.username}**` : id);
            }
            const currentBL = blNames.length > 0 ? blNames.join(', ') : await t('tempvoc.handler.none', guildId);

            await interaction.editReply({ 
                embeds: [createEmbed(await t('tempvoc.handler.bl_current', guildId, { list: currentBL }), '', 'info')], 
                components: [new ActionRowBuilder().addComponents(userSelect)]
            });
        }
        else if (customId === 'tempvoc_limit') {
            const modal = new ModalBuilder()
                .setCustomId('tempvoc_modal_limit')
                .setTitle(await t('tempvoc.handler.limit_modal_title', guildId));
            const input = new TextInputBuilder()
                .setCustomId('limit')
                .setLabel(await t('tempvoc.handler.limit_input_label', guildId))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (customId === 'tempvoc_rename') {
            const modal = new ModalBuilder()
                .setCustomId('tempvoc_modal_rename')
                .setTitle(await t('tempvoc.handler.rename_modal_title', guildId));
            const input = new TextInputBuilder()
                .setCustomId('name')
                .setLabel(await t('tempvoc.handler.rename_input_label', guildId))
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (customId === 'tempvoc_kick') {
            const members = channel.members.filter(m => m.id !== member.id);
            if (members.size === 0) {
                return interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.kick_none', guildId), '', 'error')] });
            }
            
            const select = new StringSelectMenuBuilder()
                .setCustomId('tempvoc_select_kick')
                .setPlaceholder(await t('tempvoc.handler.kick_select_placeholder', guildId))
                .addOptions(members.map(m => ({
                    label: m.user.tag,
                    value: m.id
                })));
            
            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.kick_msg', guildId), '', 'info')], components: [new ActionRowBuilder().addComponents(select)] });
        }
        
        // --- MODALS ---
        else if (customId === 'tempvoc_modal_limit') {
            const limit = parseInt(interaction.fields.getTextInputValue('limit'));
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.limit_invalid', guildId), '', 'error')], ephemeral: true });
            }
            await channel.setUserLimit(limit);
            await interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.limit_success', guildId, { limit }), '', 'success')], ephemeral: true });
        }
        else if (customId === 'tempvoc_modal_rename') {
            const name = interaction.fields.getTextInputValue('name');
            await channel.setName(name);
            await interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.rename_success', guildId, { name }), '', 'success')], ephemeral: true });
        }
        
        // --- SELECTS ---
        else if (customId === 'tempvoc_select_kick') {
            const targetId = interaction.values[0];
            const target = channel.members.get(targetId);
            if (target) {
                const targetTag = target.user.username;
                await target.voice.disconnect("Kicked by owner").catch(() => {});
                await interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.kick_success', guildId, { user: `**${targetTag}**` }), '', 'success')], components: [] });
            } else {
                await interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.kick_member_not_found', guildId), '', 'error')], components: [] });
            }
        }
        else if (customId === 'tempvoc_select_transfer') {
            const targetId = interaction.values[0];
            const target = guild.members.cache.get(targetId); // Ensure member is fetched or use cache
            
            if (!target) return interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.transfer_member_not_found', guildId), '', 'error')], components: [] });

            active.ownerId = targetId;
            await active.save();
            
            await channel.permissionOverwrites.edit(member.id, { Connect: null, ManageChannels: null, MoveMembers: null });
            await channel.permissionOverwrites.edit(targetId, { Connect: true, ManageChannels: true, MoveMembers: true });

            const targetUser = await client.users.fetch(targetId).catch(() => null);
            const targetDisplayName = targetUser ? `**${targetUser.username}**` : targetId;

            await interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.transfer_success', guildId, { user: targetDisplayName }), '', 'success')], components: [] });
        }
        else if (customId === 'tempvoc_select_wl') {
            const targetIds = interaction.values;
            const added = [];
            const removed = [];

            for (const id of targetIds) {
                if (active.allowedUsers.includes(id)) {
                    active.allowedUsers = active.allowedUsers.filter(u => u !== id);
                    removed.push(id);
                    // Remove Perms
                    await channel.permissionOverwrites.delete(id).catch(() => {});
                } else {
                    // If user is in BL, remove them from BL first
                    if (active.blockedUsers.includes(id)) {
                        active.blockedUsers = active.blockedUsers.filter(u => u !== id);
                    }
                    
                    active.allowedUsers.push(id);
                    added.push(id);
                    // Add Perms
                    await channel.permissionOverwrites.edit(id, { Connect: true, ViewChannel: true });
                }
            }
            await active.save();
            
            const messages = [];
            if (added.length > 0) {
                const names = [];
                for (const id of added) {
                    const u = await client.users.fetch(id).catch(() => null);
                    names.push(u ? `**${u.username}**` : id);
                }
                messages.push(await t('tempvoc.handler.wl_added', guildId, { list: names.join(', ') }));
            }
            if (removed.length > 0) {
                const names = [];
                for (const id of removed) {
                    const u = await client.users.fetch(id).catch(() => null);
                    names.push(u ? `**${u.username}**` : id);
                }
                messages.push(await t('tempvoc.handler.wl_removed', guildId, { list: names.join(', ') }));
            }
            
            await interaction.update({ embeds: [createEmbed(messages.join('\n') || await t('tempvoc.handler.no_change', guildId), '', 'info')], components: [] });
        }
        else if (customId === 'tempvoc_select_bl') {
            const targetIds = interaction.values;
            const added = [];
            const removed = [];

            for (const id of targetIds) {
                if (active.blockedUsers.includes(id)) {
                    active.blockedUsers = active.blockedUsers.filter(u => u !== id);
                    removed.push(id);
                    // Remove Perms (Reset to default)
                    await channel.permissionOverwrites.delete(id).catch(() => {});
                } else {
                    // If user is in WL, remove them from WL first
                    if (active.allowedUsers.includes(id)) {
                        active.allowedUsers = active.allowedUsers.filter(u => u !== id);
                    }

                    active.blockedUsers.push(id);
                    added.push(id);
                    // Add Perms (Block)
                    await channel.permissionOverwrites.edit(id, { Connect: false, ViewChannel: false });
                    
                    // Kick if present
                    const m = channel.members.get(id);
                    if (m) await m.voice.disconnect("Blacklisted").catch(() => {});
                }
            }
            await active.save();
            
            const messages = [];
            if (added.length > 0) {
                const names = [];
                for (const id of added) {
                    const u = await client.users.fetch(id).catch(() => null);
                    names.push(u ? `**${u.username}**` : id);
                }
                messages.push(await t('tempvoc.handler.bl_added', guildId, { list: names.join(', ') }));
            }
            if (removed.length > 0) {
                const names = [];
                for (const id of removed) {
                    const u = await client.users.fetch(id).catch(() => null);
                    names.push(u ? `**${u.username}**` : id);
                }
                messages.push(await t('tempvoc.handler.bl_removed', guildId, { list: names.join(', ') }));
            }
            
            await interaction.update({ embeds: [createEmbed(messages.join('\n') || await t('tempvoc.handler.no_change', guildId), '', 'info')], components: [] });
        }
    } catch (error) {
        console.error("Error in handleTempVocInteraction:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.error', interaction.guild.id, { error: error.message }), '', 'error')], ephemeral: true }).catch(() => {});
        } else {
            // If deferred, we need to edit the deferred response
            try {
                await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.error', interaction.guild.id, { error: error.message }), '', 'error')] }).catch(() => {});
            } catch (e) {
                console.error("Failed to send error message:", e);
            }
        }
    }
}

module.exports = { handleTempVocInteraction };
