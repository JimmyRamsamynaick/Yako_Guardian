const { db } = require('../../database');

module.exports = {
    name: 'raidlog',
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
            return message.reply(`Logs antiraid activés dans ${channel}.`);
        }
    }
};
