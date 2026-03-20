const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed, THEME } = require('../utils/design');
const ms = require('ms');

async function sendPunishPanel(messageOrReply, guildId) {
    const config = await getGuildConfig(guildId);
    const embed = await generatePunishEmbed(guildId, config);
    const components = await generatePunishComponents(guildId, config);

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

    // --- NAVIGATION ---
    if (customId === 'punish_panel_main') {
        const embed = await generatePunishEmbed(guildId, config);
        const components = await generatePunishComponents(guildId, config);
        await interaction.update({ embeds: [embed], components });
    }

    // --- PUNISHMENTS (STRIKE THRESHOLDS) ---
    else if (customId === 'punish_manage_thresholds') {
        const embed = await generateThresholdsEmbed(guildId, config);
        const components = await generateThresholdsComponents(guildId, config);
        await interaction.update({ embeds: [embed], components });
    }
    else if (customId === 'punish_add_threshold') {
        const modal = new ModalBuilder()
            .setCustomId('punish_modal_add_threshold')
            .setTitle(await t('moderation.punish_title', guildId));

        const countInput = new TextInputBuilder()
            .setCustomId('count')
            .setLabel("Nombre de flags (ex: 5)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionInput = new TextInputBuilder()
            .setCustomId('action')
            .setLabel("Action (warn/mute/timeout/kick/ban)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('duration')
            .setLabel("Durée (ex: 1h, 1d) - Pour mute/timeout")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(countInput),
            new ActionRowBuilder().addComponents(actionInput),
            new ActionRowBuilder().addComponents(durationInput)
        );

        await interaction.showModal(modal);
    }
    else if (customId === 'punish_select_del_threshold') {
        const count = parseInt(values[0]);
        config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);
        config.markModified('moderation');
        await config.save();
        
        const embed = await generateThresholdsEmbed(guildId, config);
        const components = await generateThresholdsComponents(guildId, config);
        await interaction.update({ embeds: [embed], components });
    }

    // --- FLAGS (ACTIONS) ---
    else if (customId === 'punish_manage_flags') {
        const embed = await generateFlagsEmbed(guildId, config);
        const components = await generateFlagsComponents(guildId, config);
        await interaction.update({ embeds: [embed], components });
    }
    else if (customId === 'punish_add_flag') {
        const modal = new ModalBuilder()
            .setCustomId('punish_modal_add_flag')
            .setTitle(await t('flags.title', guildId));

        const typeInput = new TextInputBuilder()
            .setCustomId('type')
            .setLabel("Type (link/spam/everyone/mention/caps/...)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionInput = new TextInputBuilder()
            .setCustomId('action')
            .setLabel("Action (warn/mute/timeout/kick/ban)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const valueInput = new TextInputBuilder()
            .setCustomId('value')
            .setLabel("Valeur (Flags si warn, Durée si mute/timeout)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(actionInput),
            new ActionRowBuilder().addComponents(valueInput)
        );

        await interaction.showModal(modal);
    }
    else if (customId === 'punish_select_del_flag') {
        const type = values[0];
        config.moderation.flags = config.moderation.flags.filter(f => f.type !== type);
        config.markModified('moderation');
        await config.save();
        
        const embed = await generateFlagsEmbed(guildId, config);
        const components = await generateFlagsComponents(guildId, config);
        await interaction.update({ embeds: [embed], components });
    }

    // --- MODAL SUBMITS ---
    else if (interaction.isModalSubmit()) {
        if (customId === 'punish_modal_add_threshold') {
            const count = parseInt(interaction.fields.getTextInputValue('count'));
            const action = interaction.fields.getTextInputValue('action').toLowerCase();
            const durationStr = interaction.fields.getTextInputValue('duration');

            if (isNaN(count)) return interaction.reply({ content: "Nombre invalide", ephemeral: true });
            
            let duration = null;
            if (durationStr) {
                try { duration = ms(durationStr); } catch(e) {}
            }

            config.moderation.strikes.punishments = config.moderation.strikes.punishments.filter(p => p.count !== count);
            config.moderation.strikes.punishments.push({ count, action, duration });
            config.markModified('moderation');
            await config.save();

            const embed = await generateThresholdsEmbed(guildId, config);
            const components = await generateThresholdsComponents(guildId, config);
            await interaction.update({ embeds: [embed], components });
        }
        else if (customId === 'punish_modal_add_flag') {
            const type = interaction.fields.getTextInputValue('type').toLowerCase();
            const action = interaction.fields.getTextInputValue('action').toLowerCase();
            const value = interaction.fields.getTextInputValue('value');

            let amount = 1;
            let duration = null;

            if (action === 'warn') amount = parseInt(value) || 1;
            else if (['mute', 'timeout'].includes(action)) {
                try { duration = ms(value); } catch(e) {}
            }

            if (!config.moderation.flags) config.moderation.flags = [];
            config.moderation.flags = config.moderation.flags.filter(f => f.type !== type);
            config.moderation.flags.push({ type, action, amount, duration, enabled: true });
            config.markModified('moderation');
            await config.save();

            const embed = await generateFlagsEmbed(guildId, config);
            const components = await generateFlagsComponents(guildId, config);
            await interaction.update({ embeds: [embed], components });
        }
    }
}

// --- GENERATORS ---

async function generatePunishEmbed(guildId, config) {
    return createEmbed(
        "⚖️ Panel de Punitions & Flags",
        "Bienvenue dans le gestionnaire de sanctions automatiques.\n\n" +
        "• **Seuils (Thresholds)** : Définissez quelle sanction appliquer quand un membre atteint un certain nombre de flags.\n" +
        "• **Flags** : Définissez combien de flags (ou quelle sanction) donner pour chaque type d'infraction.",
        'primary'
    );
}

async function generatePunishComponents(guildId, config) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('punish_manage_thresholds').setLabel('Gérer les Seuils').setStyle(ButtonStyle.Primary).setEmoji('⚖️'),
        new ButtonBuilder().setCustomId('punish_manage_flags').setLabel('Gérer les Flags').setStyle(ButtonStyle.Success).setEmoji('🚩')
    );
    return [row];
}

async function generateThresholdsEmbed(guildId, config) {
    const list = (config.moderation?.strikes?.punishments || []).sort((a, b) => a.count - b.count);
    let desc = "### ⚖️ Seuils de Sanctions Globaux\n\n";
    
    if (list.length === 0) desc += "*Aucun seuil configuré.*";
    else {
        list.forEach(p => {
            const dur = p.duration ? ` (${ms(p.duration)})` : "";
            desc += `• **${p.count} flags** : \`${p.action.toUpperCase()}\`${dur}\n`;
        });
    }

    return createEmbed("Configuration des Seuils", desc, 'primary');
}

async function generateThresholdsComponents(guildId, config) {
    const list = (config.moderation?.strikes?.punishments || []);
    const rows = [];

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('punish_add_threshold').setLabel('Ajouter un Seuil').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId('punish_panel_main').setLabel('Retour').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
    );
    rows.push(btnRow);

    if (list.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('punish_select_del_threshold')
            .setPlaceholder('Supprimer un seuil...')
            .addOptions(list.map(p => ({
                label: `${p.count} Flags -> ${p.action.toUpperCase()}`,
                value: p.count.toString()
            })));
        rows.push(new ActionRowBuilder().addComponents(select));
    }

    return rows;
}

async function generateFlagsEmbed(guildId, config) {
    const list = (config.moderation?.flags || []);
    let desc = "### 🚩 Configuration des Flags par Infraction\n\n";
    
    if (list.length === 0) desc += "*Aucun flag configuré.*";
    else {
        list.forEach(f => {
            const val = f.action === 'warn' ? `${f.amount} flags` : (f.duration ? ms(f.duration) : "-");
            const status = f.enabled ? "✅" : "❌";
            desc += `${status} **${f.type.toUpperCase()}** : \`${f.action}\` (${val})\n`;
        });
    }

    return createEmbed("Configuration des Flags", desc, 'success');
}

async function generateFlagsComponents(guildId, config) {
    const list = (config.moderation?.flags || []);
    const rows = [];

    const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('punish_add_flag').setLabel('Ajouter/Modifier un Flag').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId('punish_panel_main').setLabel('Retour').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
    );
    rows.push(btnRow);

    if (list.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('punish_select_del_flag')
            .setPlaceholder('Supprimer un flag...')
            .addOptions(list.map(f => ({
                label: `${f.type.toUpperCase()} -> ${f.action.toUpperCase()}`,
                value: f.type
            })));
        rows.push(new ActionRowBuilder().addComponents(select));
    }

    return rows;
}

module.exports = {
    sendPunishPanel,
    handlePunishInteraction
};
