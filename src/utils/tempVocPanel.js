const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');
const { createEmbed } = require('./design');
const { t } = require('./i18n');

function isChannelLocked(channel) {
    const everyone = channel.permissionOverwrites.cache.get(channel.guild.id);
    return Boolean(everyone?.deny.has(PermissionsBitField.Flags.Connect));
}

function isChannelHidden(channel) {
    const everyone = channel.guild.roles.everyone;
    return !channel.permissionsFor(everyone)?.has(PermissionsBitField.Flags.ViewChannel);
}

function formatUserList(ids, noneLabel, max = 5) {
    if (!ids?.length) return noneLabel;
    const shown = ids.slice(0, max).map(id => `<@${id}>`);
    if (ids.length > max) shown.push(`+${ids.length - max}`);
    return shown.join(', ');
}

async function buildTempVocComponents(guildId, channel) {
    const locked = isChannelLocked(channel);
    const hidden = isChannelHidden(channel);

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tempvoc_lock')
            .setEmoji('🔒')
            .setLabel(await t('tempvoc.lock', guildId))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(locked),
        new ButtonBuilder()
            .setCustomId('tempvoc_unlock')
            .setEmoji('🔓')
            .setLabel(await t('tempvoc.unlock', guildId))
            .setStyle(locked ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(!locked),
        new ButtonBuilder()
            .setCustomId('tempvoc_hide')
            .setEmoji(hidden ? '👁️' : '🙈')
            .setLabel(await t(hidden ? 'tempvoc.show' : 'tempvoc.hide_only', guildId))
            .setStyle(hidden ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tempvoc_transfer')
            .setEmoji('👑')
            .setLabel(await t('tempvoc.transfer', guildId))
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tempvoc_limit')
            .setEmoji('👥')
            .setLabel(await t('tempvoc.limit', guildId))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tempvoc_rename')
            .setEmoji('✏️')
            .setLabel(await t('tempvoc.rename', guildId))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tempvoc_kick')
            .setEmoji('👢')
            .setLabel(await t('tempvoc.kick', guildId))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('tempvoc_purge')
            .setEmoji('💥')
            .setLabel(await t('tempvoc.purge', guildId))
            .setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tempvoc_wl')
            .setEmoji('✅')
            .setLabel(await t('tempvoc.whitelist', guildId))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('tempvoc_bl')
            .setEmoji('⛔')
            .setLabel(await t('tempvoc.blacklist', guildId))
            .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2, row3];
}

/**
 * Build the tempvoc management panel (embed + buttons) with live status.
 */
async function buildTempVocPanel(channel, active, { mentionOwner = false } = {}) {
    const guildId = channel.guild.id;
    const locked = isChannelLocked(channel);
    const hidden = isChannelHidden(channel);
    const limit = channel.userLimit || 0;
    const members = channel.members?.size ?? 0;
    const none = await t('tempvoc.handler.none', guildId);

    const limitText = limit === 0
        ? await t('tempvoc.status.limit_none', guildId)
        : `${members}/${limit}`;

    const description = [
        mentionOwner
            ? await t('tempvoc.welcome', guildId, { user: active.ownerId })
            : await t('tempvoc.status.intro', guildId),
        '',
        await t('tempvoc.status.block', guildId, {
            owner: `<@${active.ownerId}>`,
            members: `${members}`,
            limit: limitText,
            access: locked
                ? await t('tempvoc.status.locked', guildId)
                : await t('tempvoc.status.unlocked', guildId),
            visibility: hidden
                ? await t('tempvoc.status.hidden', guildId)
                : await t('tempvoc.status.visible', guildId),
            whitelist: formatUserList(active.allowedUsers, none),
            blacklist: formatUserList(active.blockedUsers, none),
            wlCount: active.allowedUsers?.length || 0,
            blCount: active.blockedUsers?.length || 0
        })
    ].join('\n');

    const embed = createEmbed(
        await t('tempvoc.panel_title', guildId),
        description,
        'default',
        { guildId, noIcon: true }
    );

    const components = await buildTempVocComponents(guildId, channel);
    return { embeds: [embed], components };
}

/**
 * Refresh the panel message after a state change.
 */
async function refreshTempVocPanel(channel, active) {
    if (!channel || !active) return;

    try {
        const panel = await buildTempVocPanel(channel, active, { mentionOwner: false });
        let message = null;

        if (active.panelMessageId) {
            message = await channel.messages.fetch(active.panelMessageId).catch(() => null);
        }

        if (!message) {
            const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
            message = messages?.find(m =>
                m.author.id === channel.client.user.id &&
                m.components?.length > 0 &&
                m.components.some(row =>
                    row.components.some(c => c.customId?.startsWith('tempvoc_'))
                )
            ) || null;

            if (message && active.panelMessageId !== message.id) {
                active.panelMessageId = message.id;
                await active.save().catch(() => {});
            }
        }

        if (message) {
            await message.edit(panel);
        }
    } catch (e) {
        console.error('[TempVoc] Failed to refresh panel:', e.message);
    }
}

module.exports = {
    isChannelLocked,
    isChannelHidden,
    buildTempVocPanel,
    buildTempVocComponents,
    refreshTempVocPanel
};
