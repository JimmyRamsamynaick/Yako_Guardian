const { db } = require('../../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'raidlog',
    aliases: ['logs'],
    run: async (client, message, args) => {
        if (!args[0]) return message.reply('Usage: +raidlog <on/off> [salon]');
        
        const state = args[0].toLowerCase();
        
        if (state === 'off') {
            db.prepare('UPDATE guild_settings SET raid_log_channel = NULL WHERE guild_id = ?').run(message.guild.id);
            return message.reply('Logs antiraid désactivés.');
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

            channel.send({ embeds: [embed] }).catch(() => {});

            return message.reply(`✅ **Logs du serveur activés** avec succès dans ${channel}.\n_Un message de test a été envoyé dans le salon._`);
        }
    }
};
