const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField, ChannelType } = require('discord.js');
const TempVocConfig = require('../../database/models/TempVocConfig');
const ActiveTempVoc = require('../../database/models/ActiveTempVoc');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'tempvoc',
    description: 'Configuration des salons vocaux temporaires',
    category: 'Voice',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();

        // --- COMMAND PANEL ---
        if (sub === 'cmd') {
            const active = await ActiveTempVoc.findOne({ channelId: message.member.voice.channelId });
            if (!active) {
                return sendV2Message(client, message.channel.id, await t('tempvoc.not_in_temp', message.guild.id), []);
            }
            if (active.ownerId !== message.author.id) {
                return sendV2Message(client, message.channel.id, await t('tempvoc.not_owner', message.guild.id), []);
            }

            // Send Panel
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tempvoc_lock').setEmoji('🔒').setLabel(await t('tempvoc.lock', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_unlock').setEmoji('🔓').setLabel(await t('tempvoc.unlock', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_hide').setEmoji('👁️').setLabel(await t('tempvoc.hide', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_transfer').setEmoji('👑').setLabel(await t('tempvoc.transfer', message.guild.id)).setStyle(ButtonStyle.Primary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tempvoc_limit').setEmoji('👥').setLabel(await t('tempvoc.limit', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_rename').setEmoji('✏️').setLabel(await t('tempvoc.rename', message.guild.id)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_kick').setEmoji('👢').setLabel(await t('tempvoc.kick', message.guild.id)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('tempvoc_purge').setEmoji('💥').setLabel(await t('tempvoc.purge', message.guild.id)).setStyle(ButtonStyle.Danger)
            );
            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tempvoc_wl').setEmoji('✅').setLabel(await t('tempvoc.whitelist', message.guild.id)).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('tempvoc_bl').setEmoji('⛔').setLabel(await t('tempvoc.blacklist', message.guild.id)).setStyle(ButtonStyle.Secondary)
            );

            return sendV2Message(client, message.channel.id, await t('tempvoc.panel_title', message.guild.id), [row1, row2, row3]);
        }

        // --- SETUP ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('tempvoc.permission', message.guild.id), []);
        }

        if (sub === 'setup') {
            try {
                // Check Bot Permissions
                if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return sendV2Message(client, message.channel.id, await t('tempvoc.bot_perm', message.guild.id), []);
                }

                const category = await message.guild.channels.create({
                    name: await t('tempvoc.category_name', message.guild.id),
                    type: ChannelType.GuildCategory
                });

                const hub = await message.guild.channels.create({
                    name: await t('tempvoc.channel_name', message.guild.id),
                    type: ChannelType.GuildVoice,
                    parent: category.id
                });

                let config = await TempVocConfig.findOne({ guildId: message.guild.id });
                if (!config) {
                    config = new TempVocConfig({ guildId: message.guild.id });
                }

                config.categoryId = category.id;
                config.hubChannelId = hub.id;
                await config.save();

                return sendV2Message(client, message.channel.id, await t('tempvoc.setup_success', message.guild.id, { category: category.toString(), hub: hub.toString() }), []);

            } catch (e) {
                console.error(e);
                return sendV2Message(client, message.channel.id, await t('tempvoc.setup_error', message.guild.id, { error: e.message }), []);
            }
        }

        return sendV2Message(client, message.channel.id, await t('tempvoc.usage', message.guild.id), []);
    }
};
