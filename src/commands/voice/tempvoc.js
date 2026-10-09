const { PermissionsBitField, ChannelType } = require('discord.js');
const TempVocConfig = require('../../database/models/TempVocConfig');
const ActiveTempVoc = require('../../database/models/ActiveTempVoc');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

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
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('tempvoc.not_in_temp', message.guild.id), 'error')] });
            }
            if (active.ownerId !== message.author.id) {
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('tempvoc.not_owner', message.guild.id), 'error')] });
            }

            const voiceChannel = message.member.voice.channel;
            const { buildTempVocPanel } = require('../../utils/tempVocPanel');
            const panel = await buildTempVocPanel(voiceChannel, active, { mentionOwner: false });
            const panelMessage = await voiceChannel.send(panel);

            active.panelMessageId = panelMessage.id;
            await active.save();

            if (message.channel.id !== voiceChannel.id) {
                return message.channel.send({ embeds: [createEmbed('Succès', await t('tempvoc.panel_sent', message.guild.id, { channel: `<#${voiceChannel.id}>` }), 'success')] });
            }
            return;
        }

        // --- SETUP ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('tempvoc.permission', message.guild.id), 'error')] });
        }

        if (sub === 'setup') {
            try {
                // Check Bot Permissions
                if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('tempvoc.bot_perm', message.guild.id), 'error')] });
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

                return message.channel.send({ embeds: [createEmbed('Succès', await t('tempvoc.setup_success', message.guild.id, { category: category.toString(), hub: hub.toString() }), 'success')] });

            } catch (e) {
                console.error(e);
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('tempvoc.setup_error', message.guild.id, { error: e.message }), 'error')] });
            }
        }

        return message.channel.send({ embeds: [createEmbed('Usage', await t('tempvoc.usage', message.guild.id), 'info')] });
    }
};
