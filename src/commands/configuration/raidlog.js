const { db } = require('../../database');
const { EmbedBuilder } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'raidlog',
    aliases: ['logs'],
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, 'Usage: +raidlog <on/off> [salon]', []);
        
        const state = args[0].toLowerCase();
        
        if (state === 'off') {
            db.prepare('UPDATE guild_settings SET raid_log_channel = NULL WHERE guild_id = ?').run(message.guild.id);
            return sendV2Message(client, message.channel.id, 'Logs antiraid désactivés.', []);
        }
        
        if (state === 'on') {
            const channel = message.mentions.channels.first() || message.channel;
            db.prepare('UPDATE guild_settings SET raid_log_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
            
            // Send Test Log
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration des Logs')
                .setDescription(`Les logs du serveur (Sécurité, Modération, Vocal, etc.) ont été configurés avec succès dans ce salon.\nCeci est un message de test.`)
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: 'Yako Guardian Logs' });

            // Note: sendV2Message does not support embeds in Type 17 natively in the same way, but let's see.
            // Actually, we can't send embed with Type 17 easily if we strictly use V2 payload structure for EVERYTHING.
            // But sendV2Message function might not support embeds parameter.
            // ComponentUtils.js sendV2Message(client, channelId, content, components, imageUrl)
            // It does not accept embeds.
            // So we must use standard channel.send for Embeds OR convert Embed to V2 Payload (not possible for full embed features).
            // However, the user asked to "met ça en component v2 type17".
            // If we want to keep the embed, we might have to stick to channel.send for the EMBED itself.
            // But the reply "Logs du serveur activés..." can be V2.
            
            channel.send({ embeds: [embed] }).catch(() => {});

            return sendV2Message(client, message.channel.id, `✅ **Logs du serveur activés** avec succès dans ${channel}.\n_Un message de test a été envoyé dans le salon._`, []);
        }
    }
};
