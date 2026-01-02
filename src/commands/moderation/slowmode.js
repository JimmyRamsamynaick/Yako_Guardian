const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'slowmode',
    description: 'Définit le mode lent (slowmode) sur un salon',
    category: 'Moderation',
    aliases: ['slow'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return sendV2Message(client, message.channel.id, await t('slowmode.permission', message.guild.id), []);
        }

        const durationStr = args[0];
        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;

        if (!durationStr) {
            return sendV2Message(client, message.channel.id, await t('slowmode.usage', message.guild.id), []);
        }

        let seconds = 0;
        if (durationStr.toLowerCase() === 'off') {
            seconds = 0;
        } else {
            const match = durationStr.match(/^(\d+)(s|m|h)?$/);
            if (!match) {
                return sendV2Message(client, message.channel.id, await t('slowmode.invalid_duration', message.guild.id), []);
            }
            const amount = parseInt(match[1]);
            const unit = match[2] || 's';
            
            if (unit === 's') seconds = amount;
            else if (unit === 'm') seconds = amount * 60;
            else if (unit === 'h') seconds = amount * 60 * 60;
        }

        if (seconds > 21600) { // 6 hours
            return sendV2Message(client, message.channel.id, await t('slowmode.limit_exceeded', message.guild.id), []);
        }

        try {
            await channel.setRateLimitPerUser(seconds);
            if (seconds === 0) {
                return sendV2Message(client, message.channel.id, await t('slowmode.disabled', message.guild.id, { channel: channel.toString() }), []);
            } else {
                return sendV2Message(client, message.channel.id, await t('slowmode.set', message.guild.id, { duration: durationStr, channel: channel.toString() }), []);
            }
        } catch (e) {
            console.error(e);
            return sendV2Message(client, message.channel.id, await t('slowmode.error', message.guild.id), []);
        }
    }
};
