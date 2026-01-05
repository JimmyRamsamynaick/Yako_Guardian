const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    Routes,
    PermissionsBitField
} = require('discord.js');
const { db } = require('../database');
const logger = require('../utils/logger');
const { loadBackup } = require('../utils/backupHandler');
const { handleEmbedInteraction } = require('../commands/utils/embed');
const Backup = require('../database/models/Backup');
const Suggestion = require('../database/models/Suggestion');
const { createTicket } = require('../utils/modmailUtils');
const { handleRoleMenuInteraction } = require('./roleMenuHandler');
const { handleHelpMenu } = require('./helpHandler');
const { handleTicketSettings, handleTicketModal, handleTicketCreate, handleTicketClaim, handleTicketClose } = require('./ticketHandler');
const { handleTempVocInteraction } = require('./tempVocHandler');
const { handleNotificationInteraction } = require('./notificationHandler');
const { handleModmailInteraction } = require('./modmailInteractionHandler');
const { handleAutoInteraction } = require('./autoInteractionHandler');
const { handleSuggestionButton } = require('./suggestionHandler');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');
const { getGuildConfig } = require('../utils/mongoUtils');
const GuildConfig = require('../database/models/GuildConfig');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        // --- CONTEXT MENU HANDLING ---
        if (interaction.isMessageContextMenuCommand()) {
            if (interaction.commandName === 'Signaler' || interaction.commandName === 'Report Message') {
                const { handleReportContext } = require('./modmailInteractionHandler');
                await handleReportContext(client, interaction);
                return;
            }
        }

        if (!interaction.isButton() && !interaction.isAnySelectMenu() && !interaction.isModalSubmit()) return;

        // Basic permission check (Owner/Whitelist only - to be refined)
        // For now, allow anyone with Administrator or Owner for testing
        // const isAllowed = interaction.member.permissions.has('Administrator');
        // if (!isAllowed) return interaction.reply({ content: '❌ Vous n\'avez pas la permission.', ephemeral: true });

        const { customId } = interaction;

        if (customId.startsWith('secur_')) {
            await handleSecurPanel(client, interaction);
        } else if (customId.startsWith('captcha_')) {
            const { handleCaptchaInteraction } = require('./captchaHandler');
            await handleCaptchaInteraction(client, interaction);
        } else if (customId.startsWith('log_')) {
            const { handleLogInteraction } = require('./logHandler');
            await handleLogInteraction(client, interaction);
        } else if (customId.startsWith('help_')) {
            await handleHelpMenu(client, interaction);
        } else if (customId.startsWith('rolemenu_') || customId.startsWith('rm_user_')) {
            await handleRoleMenuInteraction(client, interaction);
        } else if (customId.startsWith('ticket_')) {
            if (customId.startsWith('ticket_settings_')) await handleTicketSettings(client, interaction);
            else if (customId.startsWith('ticket_modal_')) await handleTicketModal(client, interaction);
            else if (customId.startsWith('ticket_create')) await handleTicketCreate(client, interaction);
            else if (customId === 'ticket_claim') await handleTicketClaim(client, interaction);
            else if (customId === 'ticket_close_confirm') await handleTicketClose(client, interaction);
        } else if (customId.startsWith('tempvoc_')) {
            await handleTempVocInteraction(client, interaction);
        } else if (customId.startsWith('twitch_') || customId.startsWith('join_') || customId.startsWith('leave_')) {
            try {
                await handleNotificationInteraction(client, interaction);
            } catch (error) {
                logger.error(`Error in notification interaction ${customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [createEmbed("❌ " + await t('common.error_generic', interaction.guild.id), '', 'error')], ephemeral: true }).catch(() => {});
                } else {
                    // Already replied/deferred, try to follow up or log
                    logger.error("Could not reply to interaction (already processed) and error occurred.");
                }
            }
        } else if (customId.startsWith('backup_')) {
            await handleBackup(client, interaction);
        } else if (customId.startsWith('embed_') || customId.startsWith('modal_embed_')) {
            await handleEmbedInteraction(client, interaction);
        } else if (customId.startsWith('btn_role_')) {
            await handleRoleButton(client, interaction);
        } else if (customId.startsWith('suggestion_')) {
            await handleSuggestionButton(client, interaction);
        } else if (customId.startsWith('modmail_') || customId.startsWith('report_')) {
            await handleModmailInteraction(client, interaction);
        } else if (customId.startsWith('pfp_') || customId.startsWith('autopublish_')) {
            await handleAutoInteraction(client, interaction);
        } else if (customId === 'btn_set_profil') {
            await handleSetProfilButton(client, interaction);
        }
    // --- RESET HANDLERS ---
    if (customId === 'confirm_reset_server') {
        if (interaction.user.id !== interaction.guild.ownerId) {
             const { isBotOwner } = require('../utils/ownerUtils');
             if (!(await isBotOwner(interaction.user.id))) {
                 return interaction.reply({ embeds: [createEmbed(await t('handlers.owner_only', interaction.guild.id), '', 'error')], ephemeral: true });
             }
        }
        
        const { db } = require('../database');
        try {
            db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM whitelists WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM blacklists WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM forms WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(interaction.guild.id);
            db.prepare('DELETE FROM backups WHERE guild_id = ?').run(interaction.guild.id);
            
            await interaction.update({ embeds: [createEmbed(await t('handlers.reset_success', interaction.guild.id), '', 'success')], components: [] });
        } catch (e) {
            await interaction.update({ embeds: [createEmbed(await t('handlers.reset_error', interaction.guild.id, { error: e.message }), '', 'error')], components: [] });
        }
    }

    if (customId === 'confirm_reset_all') {
        const { isBotOwner } = require('../utils/ownerUtils');
        if (!(await isBotOwner(interaction.user.id))) return interaction.reply({ embeds: [createEmbed(await t('handlers.owner_only', interaction.guild.id), '', 'error')], ephemeral: true });

        const { db } = require('../database');
        try {
            db.prepare('DELETE FROM guild_settings').run();
            db.prepare('DELETE FROM whitelists').run();
            db.prepare('DELETE FROM blacklists').run();
            db.prepare('DELETE FROM forms').run();
            db.prepare('DELETE FROM command_permissions').run();
            db.prepare('DELETE FROM backups').run();
            db.prepare('DELETE FROM active_tickets').run();
            
            await interaction.update({ embeds: [createEmbed(await t('handlers.reset_all_success', interaction.guild.id), '', 'success')], components: [] });
        } catch (e) {
            await interaction.update({ embeds: [createEmbed(await t('handlers.reset_error', interaction.guild.id, { error: e.message }), '', 'error')], components: [] });
        }
    }
    
    if (customId === 'cancel_reset') {
        await interaction.update({ embeds: [createEmbed(await t('handlers.cancel', interaction.guild.id), '', 'info')], components: [] });
    }

    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        
        if (interaction.customId === 'modal_set_profil') {
            await handleSetProfilModal(client, interaction);
        }
    });
};



async function handleSetProfilButton(client, interaction) {
    // Permission check: Administrator
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ embeds: [createEmbed(await t('handlers.permission_denied', interaction.guild.id), '', 'error')], ephemeral: true });
    }

    const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId('modal_set_profil')
        .setTitle(await t('handlers.profil_modal_title', interaction.guild.id));

    const nameInput = new TextInputBuilder()
        .setCustomId('profil_name')
        .setLabel(await t('handlers.profil_name', interaction.guild.id))
        .setPlaceholder(await t('handlers.profil_name_placeholder', interaction.guild.id))
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const picInput = new TextInputBuilder()
        .setCustomId('profil_pic')
        .setLabel(await t('handlers.profil_pic', interaction.guild.id))
        .setPlaceholder(await t('handlers.profil_pic_placeholder', interaction.guild.id))
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const bannerInput = new TextInputBuilder()
        .setCustomId('profil_banner')
        .setLabel(await t('handlers.profil_banner', interaction.guild.id))
        .setPlaceholder(await t('handlers.profil_banner_placeholder', interaction.guild.id))
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(picInput),
        new ActionRowBuilder().addComponents(bannerInput)
    );

    await interaction.showModal(modal);
}

async function handleSetProfilModal(client, interaction) {
    const name = interaction.fields.getTextInputValue('profil_name');
    const pic = interaction.fields.getTextInputValue('profil_pic');
    const banner = interaction.fields.getTextInputValue('profil_banner');
    
    await interaction.deferReply({ ephemeral: true });
    
    let logs = [];
    const axios = require('axios');
    
    // Helper
    const getBase64FromUrl = async (url) => {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const mime = response.headers['content-type'];
        return `data:${mime};base64,${buffer.toString('base64')}`;
    };

    if (name) {
        try {
            await interaction.guild.members.me.setNickname(name);
            logs.push(await t('handlers.profil_logs_name', interaction.guild.id));
        } catch (e) {
            logs.push(await t('handlers.profil_logs_name_error', interaction.guild.id, { error: e.message }));
        }
    }

    if (pic) {
        try {
            const dataUri = await getBase64FromUrl(pic);
            await client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
                body: { avatar: dataUri }
            });
            logs.push(await t('handlers.profil_logs_pic', interaction.guild.id));
        } catch (e) {
            logs.push(await t('handlers.profil_logs_pic_error', interaction.guild.id, { error: e.message }));
        }
    }

    if (banner) {
        try {
            const dataUri = await getBase64FromUrl(banner);
            await client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
                body: { banner: dataUri }
            });
            logs.push(await t('handlers.profil_logs_banner', interaction.guild.id));
        } catch (e) {
            logs.push(await t('handlers.profil_logs_banner_error', interaction.guild.id, { error: e.message }));
        }
    }

    if (logs.length === 0) logs.push(await t('handlers.profil_no_change', interaction.guild.id));
    
    await interaction.editReply({ embeds: [createEmbed(logs.join('\n'), '', 'info')] });
}

async function handleRoleButton(client, interaction) {
    const { customId } = interaction;
    const roleId = customId.replace('btn_role_', '');
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
        return interaction.reply({ embeds: [createEmbed(await t('handlers.role_not_found', interaction.guild.id), '', 'error')], ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ embeds: [createEmbed(await t('handlers.role_hierarchy_error', interaction.guild.id), '', 'error')], ephemeral: true });
    }

    const member = interaction.member;

    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            return interaction.reply({ embeds: [createEmbed(await t('handlers.role_removed', interaction.guild.id, { role: role.name }), '', 'success')], ephemeral: true });
        } else {
            await member.roles.add(role);
            return interaction.reply({ embeds: [createEmbed(await t('handlers.role_added', interaction.guild.id, { role: role.name }), '', 'success')], ephemeral: true });
        }
    } catch (e) {
        console.error(e);
        return interaction.reply({ embeds: [createEmbed(await t('handlers.role_error', interaction.guild.id), '', 'error')], ephemeral: true });
    }
}

module.exports.handleSecurPanel = handleSecurPanel;

async function handleBackup(client, interaction) {
    if (interaction.customId === 'backup_cancel') {
        await interaction.message.delete().catch(() => {});
        return;
    }

    const loadMatch = interaction.customId.match(/^backup_confirm_load_(.+)$/);
    if (loadMatch) {
        const name = loadMatch[1];
        
        // Check perms
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== interaction.guild.ownerId) {
             return interaction.reply({ embeds: [createEmbed(await t('handlers.permission_denied', interaction.guild.id), '', 'error')], ephemeral: true });
        }

        try {
            await interaction.reply({ embeds: [createEmbed(await t('handlers.backup_loading', interaction.guild.id), '', 'info')], ephemeral: true });
            await loadBackup(interaction.guild, name);
            await interaction.editReply({ embeds: [createEmbed(await t('handlers.backup_loaded', interaction.guild.id, { name }), '', 'success')] });
            await interaction.message.delete().catch(() => {});
        } catch (error) {
            console.error(error);
            await interaction.editReply({ embeds: [createEmbed(await t('handlers.backup_load_error', interaction.guild.id, { error: error.message }), '', 'error')] });
        }
        return;
    }

    const delMatch = interaction.customId.match(/^backup_confirm_delete_(.+)$/);
    if (delMatch) {
        const name = delMatch[1];
        
        // Check perms
        if (!interaction.member.permissions.has('Administrator') && interaction.member.id !== interaction.guild.ownerId) {
             return interaction.reply({ embeds: [createEmbed(await t('handlers.permission_denied', interaction.guild.id), '', 'error')], ephemeral: true });
        }

        try {
            await Backup.deleteOne({ guild_id: interaction.guild.id, name: name });
            await interaction.reply({ embeds: [createEmbed(await t('handlers.backup_deleted', interaction.guild.id, { name }), '', 'success')], ephemeral: true });
            await interaction.message.delete().catch(() => {});
        } catch (error) {
            console.error(error);
            await interaction.reply({ embeds: [createEmbed(await t('handlers.backup_delete_error', interaction.guild.id, { error: error.message }), '', 'error')], ephemeral: true });
        }
        return;
    }
}



// Helper functions for Secur Panel
const generateSecurStatusText = async (guildId, s, m) => {
    const modules = await t('secur.modules_title', guildId);
    const footer = await t('secur.footer', guildId);

    const tr = async (key) => {
        if (key === 'on' || key === true) return await t('common.state_on', guildId);
        if (key === 'off' || key === false) return await t('common.state_off', guildId);
        if (key === 'max') return await t('common.state_max', guildId);
        return key;
    };

    const antispam = m?.moderation?.antispam?.enabled || false;
    const antilink = m?.moderation?.antilink?.enabled || false;
    const badwords = m?.moderation?.badwords?.enabled || false;

    return `${modules}
\`Anti-Token\` : ${await tr(s.antitoken_level)}
\`Anti-Update\` : ${await tr(s.antiupdate)}
\`Anti-Channel\` : ${await tr(s.antichannel)}
\`Anti-Role\` : ${await tr(s.antirole)}
\`Anti-Webhook\` : ${await tr(s.antiwebhook)}
\`Anti-Unban\` : ${await tr(s.antiunban)}
\`Anti-Bot\` : ${await tr(s.antibot)}
\`Anti-Ban\` : ${await tr(s.antiban)}
\`Anti-Everyone\` : ${await tr(s.antieveryone)}
\`Anti-Deco\` : ${await tr(s.antideco)}
\`Anti-Spam\` : ${await tr(antispam)}
\`Anti-Link\` : ${await tr(antilink)}
\`Bad Words\` : ${await tr(badwords)}

${footer}`;
};

const getSecurRowSelect = async (guildId) => new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('secur_select_module')
                .setPlaceholder(await t('secur.placeholder', guildId))
                .addOptions([
                    { label: await t('secur.module_antitoken', guildId), value: 'antitoken_level', description: await t('secur.desc_antitoken', guildId), emoji: '🚪' },
                    { label: await t('secur.module_antibot', guildId), value: 'antibot', description: await t('secur.desc_antibot', guildId), emoji: '🤖' },
                    { label: await t('secur.module_antiban', guildId), value: 'antiban', description: await t('secur.desc_antiban', guildId), emoji: '🔨' },
                    { label: await t('secur.module_antichannel', guildId), value: 'antichannel', description: await t('secur.desc_antichannel', guildId), emoji: '📺' },
                    { label: await t('secur.module_antirole', guildId), value: 'antirole', description: await t('secur.desc_antirole', guildId), emoji: '🎭' },
                    { label: await t('secur.module_antiwebhook', guildId), value: 'antiwebhook', description: await t('secur.desc_antiwebhook', guildId), emoji: '🔗' },
                    { label: await t('secur.module_antieveryone', guildId), value: 'antieveryone', description: await t('secur.desc_antieveryone', guildId), emoji: '📢' },
                    { label: await t('secur.module_antiupdate', guildId), value: 'antiupdate', description: await t('secur.desc_antiupdate', guildId), emoji: '⚙️' },
                    { label: await t('secur.module_antideco', guildId), value: 'antideco', description: await t('secur.desc_antideco', guildId), emoji: '🔌' },
                    { label: 'Anti-Spam', value: 'antispam', description: 'Empêche le spam de messages', emoji: '📨' },
                    { label: 'Anti-Link', value: 'antilink', description: 'Bloque les liens et invitations', emoji: '🔗' },
                    { label: 'Bad Words', value: 'badwords', description: 'Censure les mots interdits', emoji: '🤬' },
                ])
        );

const getSecurRowButtons = async (guildId) => new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('secur_toggle_all_on')
                .setLabel(await t('secur.btn_all_on', guildId))
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('secur_toggle_all_max')
                .setLabel(await t('secur.btn_all_max', guildId))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('secur_toggle_all_off')
                .setLabel(await t('secur.btn_all_off', guildId))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('secur_refresh')
                .setLabel(await t('secur.btn_refresh', guildId))
                .setStyle(ButtonStyle.Secondary)
        );

const sendSecurPanel = async (target, guildId) => {
    console.log("sendSecurPanel called for guild:", guildId);
    let settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    const mongoSettings = await getGuildConfig(guildId);
    if (!settings) {
        console.log("No settings found in SQLite, attempting insert...");
        try {
            db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(guildId);
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            console.log("Insert successful, settings:", settings);
        } catch (e) {
            console.error("Failed to init guild_settings in sendSecurPanel:", e);
            return;
        }
    } 
    
    try {
        const statusText = await generateSecurStatusText(guildId, settings, mongoSettings);
        const embed = createEmbed(await t('secur.panel_title', guildId), statusText, 'info');
        const components = [await getSecurRowSelect(guildId), await getSecurRowButtons(guildId)];
        
        if (target.reply && typeof target.reply === 'function') {
             if (target.replied || target.deferred) {
                 await target.editReply({ embeds: [embed], components });
             } else {
                 await target.reply({ embeds: [embed], components });
             }
        } else {
             await target.channel.send({ embeds: [embed], components });
        }
        console.log("Panel sent successfully");
    } catch (error) {
        console.error("Error sending secur panel:", error);
        if (target.channel) {
            target.channel.send("Error showing panel: " + error.message).catch(() => {});
        }
    }
};

module.exports.generateSecurStatusText = generateSecurStatusText;
module.exports.getSecurRowSelect = getSecurRowSelect;
module.exports.getSecurRowButtons = getSecurRowButtons;
module.exports.sendSecurPanel = sendSecurPanel;

async function handleSecurPanel(client, interaction) {
    const guildId = interaction.guild.id;
    let settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    let mongoSettings = await getGuildConfig(guildId);
    
    if (!settings) {
        try {
             db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(guildId);
             settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
        } catch (e) {
             console.error("Error init settings in handleSecurPanel:", e);
             return interaction.reply({ embeds: [createEmbed(await t('handlers.secur_no_settings', interaction.guild.id), '', 'error')], ephemeral: true });
        }
    }
    
    // --- Handling Selections ---

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('secur_select_sanction_')) {
        const moduleName = interaction.customId.replace('secur_select_sanction_', '');
        const newSanction = interaction.values[0];

        // Upsert sanction
        db.prepare(`INSERT INTO module_limits (guild_id, module, sanction) VALUES (?, ?, ?) 
            ON CONFLICT(guild_id, module) DO UPDATE SET sanction=excluded.sanction`)
            .run(guildId, moduleName, newSanction);

        // Re-display config
        const limitConfig = db.prepare('SELECT * FROM module_limits WHERE guild_id = ? AND module = ?').get(guildId, moduleName);
        const currentSanction = limitConfig?.sanction || 'kick';
        const currentLimit = limitConfig?.limit_count || 3;
        const currentTime = limitConfig?.limit_time || 10000;

        const embed = createEmbed(
            `**Configuration avancée : ${moduleName.toUpperCase()}**`,
            `Paramètres actuels :\n• Sanction : **${currentSanction.toUpperCase()}**\n• Limite : **${currentLimit}** actions\n• Temps : **${currentTime}ms**`,
            'success'
        );

        const rowSanction = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`secur_select_sanction_${moduleName}`)
                .setPlaceholder('Choisir une sanction')
                .addOptions([
                    { label: 'Kick (Expulser)', value: 'kick', emoji: '👢', default: currentSanction === 'kick' },
                    { label: 'Ban (Bannir)', value: 'ban', emoji: '🔨', default: currentSanction === 'ban' },
                    { label: 'Derank (Retirer rôles)', value: 'derank', emoji: '📉', default: currentSanction === 'derank' },
                    { label: 'Mute (Exclure 1h)', value: 'mute', emoji: '🔇', default: currentSanction === 'mute' }
                ])
        );

        const rowBtns = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`secur_btn_limits_${moduleName}`)
                .setLabel('Modifier Limites (Strike/Temps)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`secur_select_module`) 
                .setLabel('Retour Menu')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('secur_back_main')
        );

        await interaction.update({ embeds: [embed], components: [rowSanction, rowBtns] });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'secur_select_module') {
        const module = interaction.values[0];
        const isMongo = ['antispam', 'antilink', 'badwords'].includes(module);
        
        let stateStr = 'OFF';
        if (isMongo) {
            stateStr = mongoSettings.moderation?.[module]?.enabled ? 'ON' : 'OFF';
        } else {
            stateStr = settings[module];
        }

        const rowModuleActions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_off`)
                    .setLabel('OFF')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_on`)
                    .setLabel('ON')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_max`)
                    .setLabel('MAX')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`secur_mod_${module}_config`)
                    .setLabel(await t('secur.btn_config_action', interaction.guild.id))
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const rowBack = new ActionRowBuilder()
            .addComponents(
                 new ButtonBuilder()
                    .setCustomId('secur_back_main')
                    .setLabel(await t('handlers.secur_back', interaction.guild.id))
                    .setStyle(ButtonStyle.Secondary)
            );

        try {
            await interaction.update({ 
                embeds: [createEmbed(await t('handlers.secur_config_title', interaction.guild.id, { module: module.toUpperCase(), state: stateStr }), '', 'info')], 
                components: [rowModuleActions, rowBack] 
            });
        } catch (error) {
            console.error("Error updating V2 secur panel (module select):", error);
        }
        return;
    }

    // --- Handling Module Actions ---
    
    if (interaction.isButton()) {
        if (interaction.customId === 'secur_back_main' || interaction.customId === 'secur_refresh') {
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            mongoSettings = await getGuildConfig(guildId);
            try {
                const statusText = await generateSecurStatusText(guildId, settings, mongoSettings);
                await interaction.update({ 
                    embeds: [createEmbed(await t('secur.panel_title', guildId), statusText, 'info')], 
                    components: [await getSecurRowSelect(guildId), await getSecurRowButtons(guildId)] 
                });
            } catch (error) {
                console.error("Error updating V2 secur panel (back/refresh):", error);
            }
            return;
        }

        if (interaction.customId === 'secur_toggle_all_on') {
            // Update SQLite
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='on', antiupdate='on', antichannel='on', antirole='on', 
                antiwebhook='on', antiunban='on', antibot='on', antiban='on', 
                antieveryone='on', antideco='on' 
                WHERE guild_id = ?`).run(guildId);
            
            // Update Mongo
            await GuildConfig.updateOne({ guildId }, { 
                $set: { 
                    'moderation.antispam.enabled': true,
                    'moderation.antilink.enabled': true,
                    'moderation.badwords.enabled': true
                }
            });

            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            mongoSettings = await getGuildConfig(guildId);
            try {
                const statusText = await generateSecurStatusText(guildId, settings, mongoSettings);
                await interaction.update({ 
                    embeds: [createEmbed(await t('secur.panel_title', guildId), statusText, 'info')], 
                    components: [await getSecurRowSelect(guildId), await getSecurRowButtons(guildId)] 
                });
            } catch (error) {
                console.error("Error updating V2 secur panel (all on):", error);
            }
            return;
        }

        if (interaction.customId === 'secur_toggle_all_max') {
            // Update SQLite
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='max', antiupdate='max', antichannel='max', antirole='max', 
                antiwebhook='max', antiunban='max', antibot='max', antiban='max', 
                antieveryone='max', antideco='max' 
                WHERE guild_id = ?`).run(guildId);

            // Update Mongo
            await GuildConfig.updateOne({ guildId }, { 
                $set: { 
                    'moderation.antispam.enabled': true,
                    'moderation.antilink.enabled': true,
                    'moderation.antilink.mode': 'all', // Max protection
                    'moderation.badwords.enabled': true
                }
            });
            
            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            mongoSettings = await getGuildConfig(guildId);
            try {
                const statusText = await generateSecurStatusText(guildId, settings, mongoSettings);
                await interaction.update({ 
                    embeds: [createEmbed(await t('secur.panel_title', guildId), statusText, 'info')], 
                    components: [await getSecurRowSelect(guildId), await getSecurRowButtons(guildId)] 
                });
            } catch (error) {
                console.error("Error updating V2 secur panel (all max):", error);
            }
            return;
        }

        if (interaction.customId === 'secur_toggle_all_off') {
            // Update SQLite
            db.prepare(`UPDATE guild_settings SET 
                antitoken_level='off', antiupdate='off', antichannel='off', antirole='off', 
                antiwebhook='off', antiunban='off', antibot='off', antiban='off', 
                antieveryone='off', antideco='off' 
                WHERE guild_id = ?`).run(guildId);
            
            // Update Mongo
            await GuildConfig.updateOne({ guildId }, { 
                $set: { 
                    'moderation.antispam.enabled': false,
                    'moderation.antilink.enabled': false,
                    'moderation.badwords.enabled': false
                }
            });

            settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
            mongoSettings = await getGuildConfig(guildId);
            try {
                const statusText = await generateSecurStatusText(guildId, settings, mongoSettings);
                await interaction.update({ 
                    embeds: [createEmbed(await t('secur.panel_title', guildId), statusText, 'info')], 
                    components: [await getSecurRowSelect(guildId), await getSecurRowButtons(guildId)] 
                });
            } catch (error) {
                console.error("Error updating V2 secur panel (all off):", error);
            }
            return;
        }

        // Handle Limit Button
        const matchLimits = interaction.customId.match(/^secur_btn_limits_(.+)$/);
        if (matchLimits) {
            const moduleName = matchLimits[1];
            const isMongo = ['antispam', 'antilink', 'badwords'].includes(moduleName);

            // Mongo Limit Modal (Only for Antispam for now)
            if (isMongo && moduleName === 'antispam') {
                 const modal = new ModalBuilder()
                    .setCustomId(`secur_modal_mongo_${moduleName}`)
                    .setTitle(`Config ${moduleName}`);

                const limitInput = new TextInputBuilder()
                    .setCustomId('limit_count')
                    .setLabel(await t('secur.config_limit_label', interaction.guild.id))
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const timeInput = new TextInputBuilder()
                    .setCustomId('limit_time')
                    .setLabel(await t('secur.config_time_label', interaction.guild.id))
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(limitInput), new ActionRowBuilder().addComponents(timeInput));
                await interaction.showModal(modal);
                return;
            } else if (isMongo) {
                 await interaction.reply({ content: "Configuration avancée indisponible pour ce module via le panel pour l'instant.", ephemeral: true });
                 return;
            }

            // SQLite Limit Modal
            const modal = new ModalBuilder()
                .setCustomId(`secur_modal_${moduleName}`)
                .setTitle(`Config ${moduleName}`);

            const limitInput = new TextInputBuilder()
                .setCustomId('limit_count')
                .setLabel(await t('secur.config_limit_label', interaction.guild.id))
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const timeInput = new TextInputBuilder()
                .setCustomId('limit_time')
                .setLabel(await t('secur.config_time_label', interaction.guild.id))
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(new ActionRowBuilder().addComponents(limitInput), new ActionRowBuilder().addComponents(timeInput));
            await interaction.showModal(modal);
            return;
        }

        // Handle Mode Button (AntiLink)
        if (interaction.customId === 'secur_btn_mode_antilink') {
            const currentConfig = mongoSettings.moderation?.antilink || {};
            const newMode = currentConfig.mode === 'all' ? 'invite' : 'all';
            
            await GuildConfig.updateOne({ guildId }, { 
                $set: { 'moderation.antilink.mode': newMode }
            });
            
            const embed = createEmbed(
                `**Configuration : ANTILINK**`,
                `Paramètres actuels :\nMode: ${newMode}`,
                'info'
            );
            
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`secur_btn_mode_antilink`)
                    .setLabel('Changer Mode (Invite/All)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('secur_back_main')
                    .setLabel('Retour')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            await interaction.update({ embeds: [embed], components: [rowBtns] });
            return;
        }

        // Regex to catch secur_mod_<module>_<action>
        const match = interaction.customId.match(/^secur_mod_(.+?)_(off|on|max|config)$/);
        if (match) {
            const moduleName = match[1];
            const action = match[2];
            const isMongo = ['antispam', 'antilink', 'badwords'].includes(moduleName);

            if (action === 'config') {
                if (isMongo) {
                     // For Mongo modules, we show simple info for now
                     const modConfig = mongoSettings.moderation?.[moduleName] || {};
                     const limit = modConfig.limit || 'N/A';
                     const time = modConfig.time || 'N/A';
                     const mode = modConfig.mode || 'N/A';
                     
                     let desc = "";
                     if (moduleName === 'antispam') desc = `Limite: ${limit} msgs / ${time} ms`;
                     if (moduleName === 'antilink') desc = `Mode: ${mode}`;
                     
                     const embed = createEmbed(
                        `**Configuration : ${moduleName.toUpperCase()}**`,
                        `Paramètres actuels :\n${desc}`,
                        'info'
                    );
                    
                    const rowBtns = new ActionRowBuilder();
                    if (moduleName === 'antispam') {
                        rowBtns.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`secur_btn_limits_${moduleName}`)
                                .setLabel('Modifier Limites')
                                .setStyle(ButtonStyle.Primary)
                        );
                    }
                    if (moduleName === 'antilink') {
                        rowBtns.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`secur_btn_mode_${moduleName}`)
                                .setLabel('Changer Mode (Invite/All)')
                                .setStyle(ButtonStyle.Primary)
                        );
                    }
                    rowBtns.addComponents(
                        new ButtonBuilder()
                            .setCustomId('secur_back_main')
                            .setLabel('Retour')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    
                    await interaction.update({ embeds: [embed], components: [rowBtns] });
                    return;
                }

                // SQLite Config
                const limitConfig = db.prepare('SELECT * FROM module_limits WHERE guild_id = ? AND module = ?').get(guildId, moduleName);
                const currentSanction = limitConfig?.sanction || 'kick';
                const currentLimit = limitConfig?.limit_count || 3;
                const currentTime = limitConfig?.limit_time || 10000;

                const embed = createEmbed(
                    `**Configuration avancée : ${moduleName.toUpperCase()}**`,
                    `Paramètres actuels :\n• Sanction : **${currentSanction.toUpperCase()}**\n• Limite : **${currentLimit}** actions\n• Temps : **${currentTime}ms**`,
                    'info'
                );

                const rowSanction = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`secur_select_sanction_${moduleName}`)
                        .setPlaceholder('Choisir une sanction')
                        .addOptions([
                            { label: 'Kick (Expulser)', value: 'kick', emoji: '👢', default: currentSanction === 'kick' },
                            { label: 'Ban (Bannir)', value: 'ban', emoji: '🔨', default: currentSanction === 'ban' },
                            { label: 'Derank (Retirer rôles)', value: 'derank', emoji: '📉', default: currentSanction === 'derank' },
                            { label: 'Mute (Exclure 1h)', value: 'mute', emoji: '🔇', default: currentSanction === 'mute' }
                        ])
                );

                const rowBtns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`secur_btn_limits_${moduleName}`)
                        .setLabel('Modifier Limites (Strike/Temps)')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('secur_back_main')
                        .setLabel('Retour')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.update({ embeds: [embed], components: [rowSanction, rowBtns] });
                return;
            } else {
                // Update State (off, on, max)
                let newStateStr = action;
                
                if (isMongo) {
                    const update = {};
                    const state = (action === 'on' || action === 'max');
                    update[`moderation.${moduleName}.enabled`] = state;
                    
                    if (action === 'max' && moduleName === 'antilink') {
                         update[`moderation.${moduleName}.mode`] = 'all';
                    } else if (action === 'on' && moduleName === 'antilink') {
                         // Ensure default mode if not set?
                    }
                    
                    await GuildConfig.updateOne({ guildId }, { $set: update });
                    newStateStr = state ? 'ON' : 'OFF';
                    settings[moduleName] = newStateStr; // Hack for display below? No, we use separate display logic.
                } else {
                    db.prepare(`UPDATE guild_settings SET ${moduleName} = ? WHERE guild_id = ?`).run(action, guildId);
                    settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
                    newStateStr = settings[moduleName];
                }
                
                // Re-render the module view
                const rowModuleActions = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_off`).setLabel('OFF').setStyle(action === 'off' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_on`).setLabel('ON').setStyle(action === 'on' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_max`).setLabel('MAX').setStyle(action === 'max' ? ButtonStyle.Danger : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`secur_mod_${moduleName}_config`).setLabel('CONFIG').setStyle(ButtonStyle.Secondary)
                );
                const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('secur_back_main').setLabel('Retour').setStyle(ButtonStyle.Secondary));

                try {
                    await interaction.update({ 
                        embeds: [createEmbed(`**Configuration : ${moduleName.toUpperCase()}**\nÉtat actuel : ${newStateStr}\n\nChoisissez une action :`, '', 'info')], 
                        components: [rowModuleActions, rowBack] 
                    });
                } catch (error) {
                    console.error("Error updating V2 secur panel (action):", error);
                }
            }
        }
    }

    // --- Handling Modals ---
    if (interaction.isModalSubmit()) {
        const match = interaction.customId.match(/^secur_modal_(.+?)$/);
        const matchMongo = interaction.customId.match(/^secur_modal_mongo_(.+?)$/);
        
        if (matchMongo) {
            const moduleName = matchMongo[1];
            const limitCount = parseInt(interaction.fields.getTextInputValue('limit_count'));
            let limitTime = parseInt(interaction.fields.getTextInputValue('limit_time'));
            
            if (limitCount > 0 && limitTime > 0) {
                 if (limitTime < 1000) limitTime = 1000;
                 
                 const update = {};
                 update[`moderation.${moduleName}.limit`] = limitCount;
                 update[`moderation.${moduleName}.time`] = limitTime;
                 
                 await GuildConfig.updateOne({ guildId }, { $set: update });
                 
                 await interaction.reply({ embeds: [createEmbed(`✅ Configuration sauvegardée pour ${moduleName}.`, '', 'success')], ephemeral: true });
            }
            return;
        }

        if (match) {
            const moduleName = match[1];
            const limitCount = interaction.fields.getTextInputValue('limit_count');
            let limitTime = interaction.fields.getTextInputValue('limit_time');

            // Save to DB
            if (limitCount && limitTime) {
                // Enforce minimum time of 1000ms if limit > 0
                if (parseInt(limitCount) > 0 && parseInt(limitTime) < 1000) {
                    limitTime = "1000";
                }

                db.prepare(`INSERT INTO module_limits (guild_id, module, limit_count, limit_time) VALUES (?, ?, ?, ?)
                    ON CONFLICT(guild_id, module) DO UPDATE SET limit_count=excluded.limit_count, limit_time=excluded.limit_time`)
                    .run(guildId, moduleName, parseInt(limitCount), parseInt(limitTime));
                try {
                    await interaction.reply({ embeds: [createEmbed(`✅ Configuration sauvegardée pour ${moduleName} : ${limitCount} actions en ${limitTime}ms.`, '', 'success')], ephemeral: true });
                } catch (error) {
                    console.error("Error replying V2 modal:", error);
                }
            } else {
                try {
                    await interaction.reply({ embeds: [createEmbed(`⚠️ Configuration ignorée (champs vides).`, '', 'warning')], ephemeral: true });
                } catch (error) {
                    console.error("Error replying V2 modal (empty):", error);
                }
            }
        }
    }
}
