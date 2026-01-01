const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'punition',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, 'Usage: +punition <antiraid/all> <derank/kick/ban>', []);

        const type = args[0].toLowerCase(); // antiraid or all
        const sanction = args[1]?.toLowerCase();

        if (!['derank', 'kick', 'ban'].includes(sanction)) {
            return sendV2Message(client, message.channel.id, 'Sanction invalide. Utilisez: derank, kick, ban', []);
        }

        if (type === 'antiraid') {
            db.prepare('UPDATE guild_settings SET punition_antiraid = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            sendV2Message(client, message.channel.id, `Sanction antiraid définie sur : **${sanction}**`, []);
        } else if (type === 'all') {
            db.prepare('UPDATE guild_settings SET punition_all = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            sendV2Message(client, message.channel.id, `Sanction globale définie sur : **${sanction}**`, []);
        }
    }
};
