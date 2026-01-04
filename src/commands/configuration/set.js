const { PermissionsBitField, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { joinVoiceChannel } = require('@discordjs/voice');
const axios = require('axios');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'set',
    description: 'Modifie le profil du bot ou les permissions',
    category: 'Configuration',
    aliases: ['botset'],
    async run(client, message, args) {
        // Permission check: Administrator
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return message.channel.send({ embeds: [createEmbed(
                await t('set.permission', message.guild.id),
                '',
                'error'
             )] });
        }

        const type = args[0]?.toLowerCase();
        let value = args.slice(1).join(' ');

        if (!type || !value) {
            return message.channel.send({ embeds: [createEmbed(
                await t('set.usage', message.guild.id),
                '',
                'info'
            )] });
        }

        // Helper to convert URL to DataURI
        const getBase64FromUrl = async (url) => {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');
            const mime = response.headers['content-type'];
            return `data:${mime};base64,${buffer.toString('base64')}`;
        };

        if (type === 'perm' || type === 'permission') {
            const cmdName = args[1]?.toLowerCase();
            const targetStr = args[2];

            if (!cmdName || !targetStr) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.usage_perm', message.guild.id),
                    '',
                    'info'
                )] });
            }

            // Resolve target
            let roleId = null;
            let userId = null;

            if (message.mentions.roles.size > 0) roleId = message.mentions.roles.first().id;
            else if (message.mentions.users.size > 0) userId = message.mentions.users.first().id;
            else {
                // Try ID
                const id = targetStr.replace(/[<@&>]/g, '');
                if (message.guild.roles.cache.has(id)) roleId = id;
                else if (await client.users.fetch(id).catch(() => null)) userId = id;
                else return message.channel.send({ embeds: [createEmbed(
                    await t('set.target_not_found', message.guild.id),
                    '',
                    'error'
                )] });
            }

            try {
                const config = await getGuildConfig(message.guild.id);
                
                // Remove existing perm for this command/target to avoid duplicates
                config.customPermissions = config.customPermissions.filter(p => 
                    !(p.command === cmdName && (p.roleId === roleId || p.userId === userId))
                );

                config.customPermissions.push({
                    command: cmdName,
                    roleId: roleId,
                    userId: userId,
                    allowed: true
                });

                await config.save();
                const target = roleId ? `<@&${roleId}>` : `<@${userId}>`;
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.perm_added', message.guild.id, { command: cmdName, target }),
                    '',
                    'success'
                )] });

            } catch (e) {
                console.error(e);
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.perm_error', message.guild.id),
                    '',
                    'error'
                )] });
            }
        }
        else if (type === 'muterole') {
            const roleId = args[1]?.replace(/[<@&>]/g, '');
            if (!roleId) return message.channel.send({ embeds: [createEmbed(
                await t('muterole.set_usage', message.guild.id),
                '',
                'info'
            )] });

            const role = message.guild.roles.cache.get(roleId);
            if (!role) return message.channel.send({ embeds: [createEmbed(
                await t('common.role_not_found', message.guild.id),
                '',
                'error'
            )] });

            const config = await getGuildConfig(message.guild.id);
            if (!config.moderation) config.moderation = {};
            config.moderation.muteRole = role.id;
            config.markModified('moderation');
            await config.save();

            return message.channel.send({ embeds: [createEmbed(
                await t('muterole.set_success', message.guild.id, { role: role.toString() }),
                '',
                'success'
            )] });
        }
        else if (type === 'name') {
            try {
                await message.guild.members.me.setNickname(value);
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.name_success', message.guild.id, { name: value }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.name_error', message.guild.id),
                    '',
                    'error'
                )] });
            }
        } 
        else if (type === 'vocal' || type === 'vc') {
            // ... (vocal code unchanged) ...
            // Handle "+set vocal on <ID>" format
            if (args[1]?.toLowerCase() === 'on' && args[2]) {
                value = args[2];
            }

            if (value === 'off') {
                const connection = require('@discordjs/voice').getVoiceConnection(message.guild.id);
                if (connection) connection.destroy();
                db.prepare('UPDATE guild_settings SET voice_channel = ? WHERE guild_id = ?').run(null, message.guild.id);
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.vocal_off_success', message.guild.id),
                    '',
                    'success'
                )] });
            }
            
            let channelId = value;
            if (value === 'on') {
                if (!message.member.voice.channel) {
                    return message.channel.send({ embeds: [createEmbed(
                        await t('set.vocal_usage', message.guild.id),
                        '',
                        'info'
                    )] });
                }
                channelId = message.member.voice.channel.id;
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel || !channel.isVoiceBased()) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.vocal_not_found', message.guild.id, { id: channelId || 'Aucun' }),
                    '',
                    'error'
                )] });
            }

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true
                });
                db.prepare('UPDATE guild_settings SET voice_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.vocal_success', message.guild.id, { channel: channel.name }),
                    '',
                    'success'
                )] });
            } catch (e) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.vocal_error', message.guild.id, { error: e.message }),
                    '',
                    'error'
                )] });
            }
        }
        else if (type === 'pic' || type === 'avatar') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint which is specifically for updating OWN profile
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { avatar: dataUri }
                });
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.avatar_success', message.guild.id),
                    '',
                    'success'
                )] });
            } catch (e) {
                console.error("Set Pic Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.avatar_error', message.guild.id, { error: errorMsg }),
                    '',
                    'error'
                )] });
            }
        }
        else if (type === 'banner') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { banner: dataUri }
                });
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.banner_success', message.guild.id),
                    '',
                    'success'
                )] });
            } catch (e) {
                console.error("Set Banner Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.banner_error', message.guild.id, { error: errorMsg }),
                    '',
                    'error'
                )] });
            }
        }
        else if (type === 'profil') {
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_set_profil')
                    .setLabel(await t('set.profil_button', message.guild.id))
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
            );
            
            return message.channel.send({ 
                embeds: [createEmbed(
                    await t('set.profil_message', message.guild.id),
                    '',
                    'info'
                )],
                components: [row]
            });
        }
        else if (type === 'lang' || type === 'language') {
            const lang = value.toLowerCase();
            if (!['fr', 'en'].includes(lang)) {
                 return message.channel.send({ embeds: [createEmbed(
                    await t('set.lang_invalid', message.guild.id),
                    '',
                    'error'
                 )] });
            }
            
            db.prepare('UPDATE guild_settings SET language = ? WHERE guild_id = ?').run(lang, message.guild.id);
            return message.channel.send({ embeds: [createEmbed(
                await t('set.lang_success', message.guild.id, { lang: lang.toUpperCase() }),
                '',
                'success'
            )] });
        }
        else if (type === 'boostembed') {
            // +set boostembed <channel>
            // We reuse the logic: if args[1] is a channel mention/ID, set it.
            // But usually +set takes type then value.
            // If value is missing, prompt? For now, assume usage: +set boostembed <#channel>
            
            if (!value) {
                // Interactive setup could go here, but let's stick to simple channel setting for now
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.boost_usage', message.guild.id),
                    '',
                    'info'
                )] });
            }

            let channelId = value.replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel || !channel.isTextBased()) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('set.channel_invalid', message.guild.id),
                    '',
                    'error'
                )] });
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.boost) config.boost = {};
            config.boost.channelId = channel.id;
            config.boost.enabled = true; // Auto enable when setting channel
            await config.save();

            return message.channel.send({ embeds: [createEmbed(
                await t('set.boost_success', message.guild.id, { channel: channel.toString() }),
                '',
                'success'
            )] });
        }
        else if (type === 'levels' || type === 'xp') {
            const state = value.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                 return message.channel.send({ embeds: [createEmbed(await t('set.levels_usage', message.guild.id), '', 'error')] });
            }
            const config = await getGuildConfig(message.guild.id);
            if (!config.community) config.community = {};
            if (!config.community.levels) config.community.levels = {};
            config.community.levels.enabled = (state === 'on');
            config.markModified('community');
            await config.save();
            return message.channel.send({ embeds: [createEmbed(await t('set.levels_success', message.guild.id, { state: state.toUpperCase() }), '', 'success')] });
        }
        else {
            return message.channel.send({ embeds: [createEmbed(
                await t('set.invalid_option', message.guild.id),
                '',
                'error'
            )] });
        }
    }
};
