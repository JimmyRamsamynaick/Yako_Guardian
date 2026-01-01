const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField, Routes } = require('discord.js');
const { db } = require('../../database');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { joinVoiceChannel } = require('@discordjs/voice');
const axios = require('axios');

module.exports = {
    name: 'set',
    description: 'Modifie le profil du bot ou les permissions',
    category: 'Configuration',
    aliases: ['botset'],
    async run(client, message, args) {
        // Permission check: Administrator
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return sendV2Message(client, message.channel.id, "❌ Vous devez être administrateur pour utiliser cette commande.", []);
        }

        const type = args[0]?.toLowerCase();
        let value = args.slice(1).join(' ');

        if (!type || !value) {
            return sendV2Message(client, message.channel.id, 
                "**Usage:** `+set <option> <valeur>`\n\n`name <pseudo>` : Change le pseudo du bot.\n`vocal <ID/on/off>` : Connecte le bot en vocal.\n`pic <url>` : Change l'avatar du bot.\n`banner <url>` : Change la bannière du bot.\n`perm <commande> <rôle/membre>` : Autorise une commande.", 
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
                return sendV2Message(client, message.channel.id, "**Usage:** `+set perm <commande> <@rôle/@membre>`", []);
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
                else return sendV2Message(client, message.channel.id, "❌ Rôle ou membre introuvable.", []);
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
                return sendV2Message(client, message.channel.id, `✅ Permission ajoutée : La commande \`${cmdName}\` est maintenant autorisée pour ${roleId ? `<@&${roleId}>` : `<@${userId}>`}.`, []);

            } catch (e) {
                console.error(e);
                return sendV2Message(client, message.channel.id, "❌ Erreur lors de l'enregistrement de la permission.", []);
            }
        }
        else if (type === 'name') {
            try {
                await message.guild.members.me.setNickname(value);
                return sendV2Message(client, message.channel.id, `✅ Pseudo du bot modifié en **${value}** sur ce serveur.`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Impossible de changer le pseudo (Permissions insuffisantes ?).`, []);
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
                return sendV2Message(client, message.channel.id, "✅ Déconnecté du salon vocal.", []);
            }
            
            let channelId = value;
            if (value === 'on') {
                if (!message.member.voice.channel) {
                    return sendV2Message(client, message.channel.id, "❌ Vous devez être dans un salon vocal ou spécifier un ID.", []);
                }
                channelId = message.member.voice.channel.id;
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel || !channel.isVoiceBased()) {
                return sendV2Message(client, message.channel.id, `❌ Salon vocal introuvable ou ID invalide (${channelId || 'Aucun'}).`, []);
            }

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true
                });
                db.prepare('UPDATE guild_settings SET voice_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
                return sendV2Message(client, message.channel.id, `✅ Connecté au salon vocal **${channel.name}**.`, []);
            } catch (e) {
                return sendV2Message(client, message.channel.id, `❌ Erreur de connexion: ${e.message}`, []);
            }
        }
        else if (type === 'pic' || type === 'avatar') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint which is specifically for updating OWN profile
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { avatar: dataUri }
                });
                return sendV2Message(client, message.channel.id, "✅ Avatar de serveur modifié avec succès ! (Si vous ne le voyez pas, faites Ctrl+R)", []);
            } catch (e) {
                console.error("Set Pic Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return sendV2Message(client, message.channel.id, `❌ Échec de la modification de l'avatar : ${errorMsg}`, []);
            }
        }
        else if (type === 'banner') {
            try {
                const dataUri = await getBase64FromUrl(value);
                // Attempt using @me endpoint
                await client.rest.patch(Routes.guildMember(message.guild.id, '@me'), {
                    body: { banner: dataUri }
                });
                return sendV2Message(client, message.channel.id, "✅ Bannière de serveur modifiée avec succès ! (Si vous ne le voyez pas, faites Ctrl+R)", []);
            } catch (e) {
                console.error("Set Banner Error:", e);
                const errorMsg = e.rawError?.message || e.message;
                return sendV2Message(client, message.channel.id, `❌ Échec de la modification de la bannière : ${errorMsg}`, []);
            }
        }
        else if (type === 'profil') {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_set_profil')
                    .setLabel('Ouvrir le menu de modification')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
            );
            
            return sendV2Message(client, message.channel.id, "Cliquez ci-dessous pour modifier le profil du bot (Pseudo, Avatar, Bannière) en une fois.", [row]);
        }
        else if (type === 'lang' || type === 'language') {
            const lang = value.toLowerCase();
            if (!['fr', 'en'].includes(lang)) {
                 return sendV2Message(client, message.channel.id, "❌ Langues disponibles: `fr`, `en`.\nPour une langue personnalisée, utilisez `+lang custom`.", []);
            }
            
            db.prepare('UPDATE guild_settings SET language = ? WHERE guild_id = ?').run(lang, message.guild.id);
            return sendV2Message(client, message.channel.id, `✅ Langue définie sur **${lang.toUpperCase()}**.`, []);
        }
        else {
            return sendV2Message(client, message.channel.id, "❌ Option invalide. Voir `+set`.", []);
        }
    }
};
