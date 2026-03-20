const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed, THEME } = require('../utils/design');
const ms = require('ms');

async function sendPunishPanel(messageOrReply, guildId) {
    const config = await getGuildConfig(guildId);
    const embed = await generateSimpleEmbed(guildId, config);
    const components = await generateSimpleComponents(guildId, config);

    if (messageOrReply.edit) {
        await messageOrReply.edit({ embeds: [embed], components });
    } else {
        await messageOrReply.channel.send({ embeds: [embed], components });
    }
}

async function handlePunishInteraction(client, interaction) {
    if (!interaction.guild) return;
    const { customId, values, guild, member } = interaction;
    const guildId = guild.id;

    if (!member.permissions.has('Administrator')) {
        return interaction.reply({ content: await t('common.admin_only', guildId), ephemeral: true });
    }

    const config = await getGuildConfig(guildId);
    if (!config.moderation) config.moderation = {};
    if (!config.moderation.strikes) config.moderation.strikes = { punishments: [] };
    if (!config.moderation.flags) config.moderation.flags = [];

    // --- BUTTONS ---
    if (customId === 'punish_add_flag') {
        const modal = new ModalBuilder()
            .setCustomId('punish_modal_flag')
            .setTitle(await t('punish_panel.modal_flag_title', guildId));

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('type').setLabel(await t('punish_panel.modal_type_label', guildId)).setPlaceholder('link, spam, everyone, caps...').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel(await t('punish_panel.modal_amount_label', guildId)).setPlaceholder('Ex: 5').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }
    else if (customId === 'punish_add_threshold') {
        const modal = new ModalBuilder()
            .setCustomId('punish_modal_threshold')
            .setTitle(await t('punish_panel.modal_threshold_title', guildId));

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('count').setLabel(await t('punish_panel.modal_count_label', guildId)).setPlaceholder('Ex: 10').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('action').setLabel(await t('punish_panel.modal_action_label', guildId)).setPlaceholder('mute, timeout, kick, ban').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel(await t('punish_panel.modal_duration_label', guildId)).setPlaceholder('Ex: 1h, 1d').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
    }
    else if (customId === 'punish_del_flag_menu') {
        config.moderation.flags = config.moderation.flags.filter(f => f.type !== values[0]);
        config.markModified('moderation');
        await config.save();
        await updatePanel(interaction, guildId, config);
    }
    else if (customId === 'punish_del_threshold_menu') {
        const count = parseInt(values[0]);
        config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);
        config.markModified('moderation');
        await config.save();
        await updatePanel(interaction, guildId, config);
    }

    // --- MODALS ---
    else if (interaction.isModalSubmit()) {
        if (customId === 'punish_modal_flag') {
            const type = interaction.fields.getTextInputValue('type').toLowerCase().trim();
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (!type || isNaN(amount)) return interaction.reply({ content: await t('punish_panel.invalid_data', guildId), ephemeral: true });

            config.moderation.flags = config.moderation.flags.filter(f => f.type !== type);
            config.moderation.flags.push({ type, action: 'warn', amount, enabled: true });
            config.markModified('moderation');
            await config.save();
            await updatePanel(interaction, guildId, config);
        }
        else if (customId === 'punish_modal_threshold') {
            const count = parseInt(interaction.fields.getTextInputValue('count'));
            const action = interaction.fields.getTextInputValue('action').toLowerCase().trim();
            const durationStr = interaction.fields.getTextInputValue('duration');

            if (isNaN(count) || !action) return interaction.reply({ content: await t('punish_panel.invalid_data', guildId), ephemeral: true });

            let duration = null;
            if (durationStr) {
                try { duration = ms(durationStr); } catch(e) {}
            }

            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);
            config.moderation.strikes.punishments.push({ count, action, duration });
            config.markModified('moderation');
            await config.save();
            await updatePanel(interaction, guildId, config);
        }
    }
}

async function updatePanel(interaction, guildId, config) {
    const embed = await generateSimpleEmbed(guildId, config);
    const components = await generateSimpleComponents(guildId, config);
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components });
    } else {
        await interaction.update({ embeds: [embed], components });
    }
}

async function generateSimpleEmbed(guildId, config) {
    const flags = config.moderation?.flags || [];
    const thresholds = (config.moderation?.strikes?.punishments || []).sort((a, b) => a.count - b.count);

    let flagsList = "";
    if (flags.length === 0) flagsList = await t('punish_panel.no_data', guildId);
    else {
        for (const f of flags) {
            flagsList += await t('punish_panel.item_flag', guildId, { type: f.type.toUpperCase(), amount: f.amount }) + "\n";
        }
    }

    let thresholdsList = "";
    if (thresholds.length === 0) thresholdsList = await t('punish_panel.no_data', guildId);
    else {
        for (const p of thresholds) {
            const dur = p.duration ? ` (${ms(p.duration)})` : "";
            thresholdsList += await t('punish_panel.item_threshold', guildId, { count: p.count, action: p.action.toUpperCase(), duration: dur }) + "\n";
        }
    }

    return createEmbed(
        await t('punish_panel.title', guildId),
        await t('punish_panel.main_desc', guildId, { flags_list: flagsList, thresholds_list: thresholdsList }),
        'primary'
    );
}

async function generateSimpleComponents(guildId, config) {
    const flags = config.moderation?.flags || [];
    const thresholds = config.moderation?.strikes?.punishments || [];
    const rows = [];

    // Row 1: Add buttons
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('punish_add_flag').setLabel(await t('punish_panel.btn_add_flag', guildId)).setStyle(ButtonStyle.Success).setEmoji('🚩'),
        new ButtonBuilder().setCustomId('punish_add_threshold').setLabel(await t('punish_panel.btn_add_threshold', guildId)).setStyle(ButtonStyle.Primary).setEmoji('⚖️')
    );
    rows.push(row1);

    // Row 2: Delete Flag Select
    if (flags.length > 0) {
        const selectFlags = new StringSelectMenuBuilder()
            .setCustomId('punish_del_flag_menu')
            .setPlaceholder(await t('punish_panel.btn_del_flag', guildId))
            .addOptions(flags.map(f => ({ label: f.type.toUpperCase(), value: f.type })));
        rows.push(new ActionRowBuilder().addComponents(selectFlags));
    }

    // Row 3: Delete Threshold Select
    if (thresholds.length > 0) {
        const selectThresholds = new StringSelectMenuBuilder()
            .setCustomId('punish_del_threshold_menu')
            .setPlaceholder(await t('punish_panel.btn_del_threshold', guildId))
            .addOptions(thresholds.map(p => ({ label: `${p.count} Flags -> ${p.action.toUpperCase()}`, value: p.count.toString() })));
        rows.push(new ActionRowBuilder().addComponents(selectThresholds));
    }

    return rows;
}

module.exports = {
    sendPunishPanel,
    handlePunishInteraction
};
