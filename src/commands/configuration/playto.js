const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'playto',
    aliases: ['play'],
    description: 'Change l\'activité du bot (Joue à...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('playto.permission', message.guild.id), []);
        }

        const text = args.join(' ');
        if (!text) return sendV2Message(client, message.channel.id, await t('playto.usage', message.guild.id), []);

        await setBotActivity(client, message, 'play', text);
    }
};