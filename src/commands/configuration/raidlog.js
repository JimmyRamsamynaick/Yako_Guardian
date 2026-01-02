const { db } = require('../../database');
const { EmbedBuilder } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'raidlog',
    aliases: ['logs'],
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('raidlog.usage', message.guild.id), []);
        
        const state = args[0].toLowerCase();
        
        if (state === 'off') {
            db.prepare('UPDATE guild_settings SET raid_log_channel = NULL WHERE guild_id = ?').run(message.guild.id);
            return sendV2Message(client, message.channel.id, await t('raidlog.disabled', message.guild.id), []);
        }
        
        if (state === 'on') {
            const channel = message.mentions.channels.first() || message.channel;
            db.prepare('UPDATE guild_settings SET raid_log_channel = ? WHERE guild_id = ?').run(channel.id, message.guild.id);
            
            // Send Test Log
            const embed = new EmbedBuilder()
                .setTitle(await t('raidlog.test_title', message.guild.id))
                .setDescription(await t('raidlog.test_desc', message.guild.id))
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: await t('raidlog.footer', message.guild.id) });

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

            return sendV2Message(client, message.channel.id, await t('raidlog.success', message.guild.id, { channel: channel.toString() }), []);
        }
    }
};
