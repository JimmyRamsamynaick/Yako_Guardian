const { createEmbed, THEME } = require('../../utils/design');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'slowmode',
    description: 'Définit le mode lent (slowmode) sur un salon',
    category: 'Moderation',
    aliases: ['slow'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('slowmode.permission', message.guild.id), 'error')] });
        }

        const durationStr = args[0];
        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;

        if (!durationStr) {
            return message.channel.send({ embeds: [createEmbed('Utilisation Incorrecte', await t('slowmode.usage', message.guild.id), 'warning')] });
        }

        let seconds = 0;
        if (durationStr.toLowerCase() === 'off') {
            seconds = 0;
        } else {
            const match = durationStr.match(/^(\d+)(s|m|h)?$/);
            if (!match) {
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('slowmode.invalid_duration', message.guild.id), 'error')] });
            }
            const amount = parseInt(match[1]);
            const unit = match[2] || 's';
            
            if (unit === 's') seconds = amount;
            else if (unit === 'm') seconds = amount * 60;
            else if (unit === 'h') seconds = amount * 60 * 60;
        }

        if (seconds > 21600) { // 6 hours
            return message.channel.send({ embeds: [createEmbed('Erreur', await t('slowmode.limit_exceeded', message.guild.id), 'error')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('Slowmode', `${THEME.icons.loading} Configuration du salon...`, 'loading')] });

        try {
            await channel.setRateLimitPerUser(seconds);
            if (seconds === 0) {
                await replyMsg.edit({ embeds: [createEmbed('Succès', await t('slowmode.disabled', message.guild.id, { channel: channel.toString() }), 'success')] });
            } else {
                await replyMsg.edit({ embeds: [createEmbed('Succès', await t('slowmode.set', message.guild.id, { duration: durationStr, channel: channel.toString() }), 'success')] });
            }
        } catch (e) {
            console.error(e);
            await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('slowmode.error', message.guild.id), 'error')] });
        }
    }
};
