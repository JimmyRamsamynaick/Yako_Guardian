const { db } = require('../../database');

module.exports = {
    name: 'punition',
    run: async (client, message, args) => {
        if (!args[0]) return message.reply('Usage: +punition <antiraid/all> <derank/kick/ban>');

        const type = args[0].toLowerCase(); // antiraid or all
        const sanction = args[1]?.toLowerCase();

        if (!['derank', 'kick', 'ban'].includes(sanction)) {
            return message.reply('Sanction invalide. Utilisez: derank, kick, ban');
        }

        if (type === 'antiraid') {
            db.prepare('UPDATE guild_settings SET punition_antiraid = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            message.reply(`Sanction antiraid définie sur : **${sanction}**`);
        } else if (type === 'all') {
            db.prepare('UPDATE guild_settings SET punition_all = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            message.reply(`Sanction globale définie sur : **${sanction}**`);
        }
    }
};
