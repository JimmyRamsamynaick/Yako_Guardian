const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField, ChannelType } = require('discord.js');
const TempVocConfig = require('../../database/models/TempVocConfig');
const ActiveTempVoc = require('../../database/models/ActiveTempVoc');

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
                return sendV2Message(client, message.channel.id, "❌ Vous n'êtes pas dans un salon temporaire actif.", []);
            }
            if (active.ownerId !== message.author.id) {
                return sendV2Message(client, message.channel.id, "❌ Vous n'êtes pas le propriétaire de ce salon.", []);
            }

            // Send Panel
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tempvoc_lock').setEmoji('🔒').setLabel('Verrouiller').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_unlock').setEmoji('🔓').setLabel('Déverrouiller').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_hide').setEmoji('👁️').setLabel('Masquer').setStyle(ButtonStyle.Secondary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tempvoc_limit').setEmoji('👥').setLabel('Limite').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_rename').setEmoji('✏️').setLabel('Renommer').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tempvoc_kick').setEmoji('👢').setLabel('Kick').setStyle(ButtonStyle.Danger)
            );

            return sendV2Message(client, message.channel.id, "**🎮 Gestion Vocal Temporaire**", [row1, row2]);
        }

        // --- SETUP ---
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, "❌ Permission `Administrateur` requise.", []);
        }

        if (sub === 'setup') {
            try {
                // Check Bot Permissions
                if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return sendV2Message(client, message.channel.id, "❌ Je n'ai pas la permission `Gérer les salons`.", []);
                }

                const category = await message.guild.channels.create({
                    name: 'VOCAUX TEMPORAIRES',
                    type: ChannelType.GuildCategory
                });

                const hub = await message.guild.channels.create({
                    name: '➕ Créer un salon',
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

                return sendV2Message(client, message.channel.id, `✅ Système configuré !\nCatégorie: <#${category.id}>\nHub: <#${hub.id}>`, []);

            } catch (e) {
                console.error(e);
                return sendV2Message(client, message.channel.id, `❌ Erreur lors de la création des salons: ${e.message}`, []);
            }
        }

        return sendV2Message(client, message.channel.id, "**Usage:** `+tempvoc setup` ou `+tempvoc cmd`", []);
    }
};
