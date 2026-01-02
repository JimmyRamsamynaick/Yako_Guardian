const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const ActiveTempVoc = require('../database/models/ActiveTempVoc');
const { createEmbed } = require('../utils/design');
const { t } = require('../utils/i18n');

async function handleTempVocInteraction(client, interaction) {
    try {
        const { customId, member, guild, channel } = interaction;
        const guildId = guild.id;
        
        // Check if channel is temp voc
        const active = await ActiveTempVoc.findOne({ channelId: channel.id });
        if (!active) {
            // Can't defer if we want to reply ephemeral error? 
            // Better to just reply directly or defer then reply.
            // Since this is a quick DB check, reply directly is fine.
            // But to be safe and consistent, let's just reply.
            // However, we need to handle the defer logic below.
            // Let's do the check first.
        }

        // We defer immediately unless it's a modal trigger
        if (!['tempvoc_limit', 'tempvoc_rename'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });
        }

        if (!active) {
            return interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.not_temp_voc', guildId), '', 'error')], ephemeral: true });
        }

        if (active.ownerId !== member.id) {
            return interaction.reply({ embeds: [createEmbed(await t('tempvoc.handler.not_owner', guildId), '', 'error')], ephemeral: true });
        }

        // --- BUTTONS ---

        if (customId === 'tempvoc_lock') {
            // Lock: Visible but Locked
            await channel.permissionOverwrites.edit(guild.id, { Connect: false, ViewChannel: true });
            await interaction.editReply({ embeds: [createEmbed(await t('tempvoc.handler.locked', guildId), '', 'success')] });
        }
        else if (customId === 'tempvoc_unlock') {
            await channel.permissionOverwrites.edit(guild.id, { Connect: true, ViewChannel: true });
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
            // Show WL Management Menu
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('tempvoc_select_wl')
                .setPlaceholder(await t('tempvoc.handler.wl_select_placeholder', guildId))
                .setMinValues(1)
                .setMaxValues(10);

            const currentWL = active.allowedUsers.length > 0 
                ? active.allowedUsers.map(id => `<@${id}>`).join(', ') 
                : await t('tempvoc.handler.none', guildId);

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

            const currentBL = active.blockedUsers.length > 0 
                ? active.blockedUsers.map(id => `<@${id}>`).join(', ') 
                : await t('tempvoc.handler.none', guildId);

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
                await target.voice.disconnect("Kicked by owner").catch(() => {});
                await interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.kick_success', guildId, { user: target.user.tag }), '', 'success')], components: [] });
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

            await interaction.update({ embeds: [createEmbed(await t('tempvoc.handler.transfer_success', guildId, { user: target.toString() }), '', 'success')], components: [] });
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
                    active.allowedUsers.push(id);
                    added.push(id);
                    // Add Perms
                    await channel.permissionOverwrites.edit(id, { Connect: true, ViewChannel: true });
                }
            }
            await active.save();
            
            let msg = "";
            if (added.length > 0) msg += await t('tempvoc.handler.wl_added', guildId, { list: added.map(id => `<@${id}>`).join(', ') }) + "\n";
            if (removed.length > 0) msg += await t('tempvoc.handler.wl_removed', guildId, { list: removed.map(id => `<@${id}>`).join(', ') });
            
            await interaction.update({ embeds: [createEmbed(msg || await t('tempvoc.handler.no_change', guildId), '', 'info')], components: [] });
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
            
            let msg = "";
            if (added.length > 0) msg += await t('tempvoc.handler.bl_added', guildId, { list: added.map(id => `<@${id}>`).join(', ') }) + "\n";
            if (removed.length > 0) msg += await t('tempvoc.handler.bl_removed', guildId, { list: removed.map(id => `<@${id}>`).join(', ') });
            
            await interaction.update({ embeds: [createEmbed(msg || await t('tempvoc.handler.no_change', guildId), '', 'info')], components: [] });
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
