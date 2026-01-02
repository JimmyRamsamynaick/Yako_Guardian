const { PermissionsBitField } = require('discord.js');
const { sendV2Message } = require('../../utils/componentUtils');
const { setBotActivity } = require('../../utils/presenceUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'stream',
    description: 'Change l\'activité du bot (Streame...)',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('stream.permission', message.guild.id), []);
        }

        const text = args.join(' ');
        if (!text) return sendV2Message(client, message.channel.id, await t('stream.usage', message.guild.id), []);

        // Use a default URL if not extracted, or maybe args?
        // Crowbot just says +stream [message]. It likely uses a default twitch url.
        const defaultUrl = 'https://www.twitch.tv/discord';
        
        await setBotActivity(client, message, 'stream', text, defaultUrl);
    }
};