const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField, Routes } = require('discord.js');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { joinVoiceChannel } = require('@discordjs/voice');
const axios = require('axios');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'set',
    description: 'Modifie le profil du bot ou les permissions',
    category: 'Configuration',
    aliases: ['botset'],
    async run(client, message, args) {
        // Permission check: Administrator
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return sendV2Message(client, message.channel.id, await t('set.permission', message.guild.id), []);
        }

        const type = args[0]?.toLowerCase();
        let value = args.slice(1).join(' ');

        if (!type || !value) {
            return sendV2Message(client, message.channel.id, 
                await t('set.usage', message.guild.id), 
            []);
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
                return sendV2Message(client, message.channel.id, await t('set.usage_perm', message.guild.id), []);
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
                else return sendV2Message(client, message.channel.id, await t('set.target_not_found', message.guild.id), []);
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
                return sendV2Message(client, message.channel.id, await t('set.perm_added', message.guild.id, { command: cmdName, target }), []);

            } catch (e) {
                console.error(e);
                return sendV2Message(client, message.channel.id, await t('set.perm_error', message.guild.id), []);
            }
        }
        else if (type === 'name') {
            try {
                await message.guild.members.me.setNickname(value);
                return sendV2Message(client, message.channel.id, await t('set.name_success', message.guild.id, { name: value }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('set.name_error', message.guild.id), []);
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
                return sendV2Message(client, message.channel.id, await t('set.vocal_off_success', message.guild.id), []);
            }
            
            let channelId = value;
            if (value === 'on') {
                if (!message.member.voice.channel) {
                    return sendV2Message(client, message.channel.id, await t('set.vocal_usage', message.guild.id), []);
                }
                channelId = message.member.voice.channel.id;
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel || !channel.isVoiceBased()) {
                return sendV2Message(client, message.channel.id, await t('set.vocal_not_found', message.guild.id, { id: channelId || 'Aucun' }), []);
            }

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true
                });
                db.prepare('UPDATE guild_settings SET voice_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
                return sendV2Message(client, message.channel.id, await t('set.vocal_success', message.guild.id, { channel: channel.name }), []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, await t('set.vocal_error', message.guild.id, { error: e.message }), []);
            }
        }
        else if (type === 'pic' || type === 'avatar') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint which is specifically for updating OWN profile
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { avatar: dataUri }
                });
                return sendV2Message(client, message.channel.id, await t('set.avatar_success', message.guild.id), []);
            } catch (e) {
                console.error("Set Pic Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return sendV2Message(client, message.channel.id, await t('set.avatar_error', message.guild.id, { error: errorMsg }), []);
            }
        }
        else if (type === 'banner') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { banner: dataUri }
                });
                return sendV2Message(client, message.channel.id, await t('set.banner_success', message.guild.id), []);
            } catch (e) {
                console.error("Set Banner Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return sendV2Message(client, message.channel.id, await t('set.banner_error', message.guild.id, { error: errorMsg }), []);
            }
        }
        else if (type === 'profil') {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_set_profil')
                    .setLabel(await t('set.profil_button', message.guild.id))
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
            );
            
            return sendV2Message(client, message.channel.id, await t('set.profil_message', message.guild.id), [row]);
        }
        else if (type === 'lang' || type === 'language') {
            const lang = value.toLowerCase();
            if (!['fr', 'en'].includes(lang)) {
                 return sendV2Message(client, message.channel.id, await t('set.lang_invalid', message.guild.id), []);
            }
            
            db.prepare('UPDATE guild_settings SET language = ? WHERE guild_id = ?').run(lang, message.guild.id);
            return sendV2Message(client, message.channel.id, await t('set.lang_success', message.guild.id, { lang: lang.toUpperCase() }), []);
        }
        else if (type === 'boostembed') {
            // +set boostembed <channel>
            // We reuse the logic: if args[1] is a channel mention/ID, set it.
            // But usually +set takes type then value.
            // If value is missing, prompt? For now, assume usage: +set boostembed <#channel>
            
            if (!value) {
                // Interactive setup could go here, but let's stick to simple channel setting for now
                return sendV2Message(client, message.channel.id, await t('set.boost_usage', message.guild.id), []);
            }

            let channelId = value.replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);

            if (!channel || !channel.isTextBased()) {
                return sendV2Message(client, message.channel.id, await t('set.channel_invalid', message.guild.id), []);
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.boost) config.boost = {};
            config.boost.channelId = channel.id;
            config.boost.enabled = true; // Auto enable when setting channel
            await config.save();

            return sendV2Message(client, message.channel.id, await t('set.boost_success', message.guild.id, { channel: channel.toString() }), []);
        }
        else {
            return sendV2Message(client, message.channel.id, await t('set.invalid_option', message.guild.id), []);
        }
    }
};
