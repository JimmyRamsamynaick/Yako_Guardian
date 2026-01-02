const { db } = require('../../database');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'punition',
    run: async (client, message, args) => {
        if (!args[0]) return sendV2Message(client, message.channel.id, await t('punition.usage', message.guild.id), []);

        const type = args[0].toLowerCase(); // antiraid or all
        const sanction = args[1]?.toLowerCase();

        if (!['derank', 'kick', 'ban'].includes(sanction)) {
            return sendV2Message(client, message.channel.id, await t('punition.invalid_sanction', message.guild.id), []);
        }

        if (type === 'antiraid') {
            db.prepare('UPDATE guild_settings SET punition_antiraid = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            sendV2Message(client, message.channel.id, await t('punition.success_antiraid', message.guild.id, { sanction }), []);
        } else if (type === 'all') {
            db.prepare('UPDATE guild_settings SET punition_all = ? WHERE guild_id = ?').run(sanction, message.guild.id);
            sendV2Message(client, message.channel.id, await t('punition.success_all', message.guild.id, { sanction }), []);
        }
    }
};
